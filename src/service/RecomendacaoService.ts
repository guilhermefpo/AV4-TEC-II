import type Projeto from "../entities/Projeto.js";
import type Recomendacao from "../entities/Recomendacao.js";
import type OrquestradorEquipe from "../template/OrquestradorEquipe.js";
import EmissorRecomendacao from "../observer/EmissorRecomendacao.js";
import EventoRecomendacao from "../observer/EventoRecomendacao.js";
import type ProfissionalRepository from "../repository/ProfissionalRepository.js";
import type ProjetoRepository from "../repository/ProjetoRepository.js";
import type { Papel } from "../enum/Papel.js";
import type Profissional from "../entities/Profissional.js";
import { consultarProfissionais } from "../messaging/RabbitMq.js";
import ProfissionalEntidade from "../entities/Profissional.js";
import { publicarComandoProjeto } from "../messaging/RabbitMq.js";

export default class RecomendacaoService {
  constructor(
    private repository: ProfissionalRepository,
    private orquestrador: OrquestradorEquipe,
    private emissor: EmissorRecomendacao,
    private projetoRepository: ProjetoRepository,
  ) {}

  public async gerarRecomendacoes(
    projeto: Projeto,
    orquestrador: OrquestradorEquipe = this.orquestrador,
  ): Promise<Recomendacao[]> {
    let profissionaisDisponiveis: Profissional[];

    try {
      profissionaisDisponiveis = process.env.RABBITMQ_URL
        ? (await consultarProfissionais()).map((p) => ProfissionalEntidade.criar(p as Parameters<typeof ProfissionalEntidade.criar>[0]))
        : await this.repository.listarDisponiveis();
    } catch (erro) {
      profissionaisDisponiveis = [];
    }

    const recomendacoes = orquestrador.processarRecomendacao(
      projeto,
      profissionaisDisponiveis,
    );

    this.emissor.notificar(
      new EventoRecomendacao("recomendacao_gerada", {
        projetoId: projeto.id,
        totalPapeis: recomendacoes.length,
      }),
    );

    return recomendacoes;
  }

  public async recomendarParaPapel(
    projetoId: string,
    papel: Papel,
  ): Promise<Recomendacao> {
    const projeto = await this.projetoRepository.buscarPorId(projetoId);
    if (!projeto) {
      throw new Error(`Projeto ${projetoId} não encontrado.`);
    }

    const papelExiste = projeto.papeisObrigatorios.some(
      (p) => p.papel === papel,
    );
    if (!papelExiste) {
      throw new Error(`Papel ${papel} não é obrigatório neste projeto.`);
    }

    let profissionaisDisponiveis: Profissional[];
    try {
      profissionaisDisponiveis = process.env.RABBITMQ_URL
        ? (await consultarProfissionais()).map((p) => ProfissionalEntidade.criar(p as Parameters<typeof ProfissionalEntidade.criar>[0]))
        : await this.repository.listarDisponiveis();
    } catch (erro) {
      profissionaisDisponiveis = [];
    }

    const recomendacao = this.orquestrador.recomendarUnico(
      projeto,
      papel,
      profissionaisDisponiveis,
    );

    this.emissor.notificar(
      new EventoRecomendacao("recomendacao_gerada", {
        projetoId,
        papel,
        mensagem: "Nova rodada de recomendação para papel substituído.",
      }),
    );

    return recomendacao;
  }

  public async reavaliarCompleta(
    projetoId: string,
    novoOrcamento?: number,
    novoPrazo?: Date,
  ): Promise<Recomendacao[]> {
    const projeto = await this.projetoRepository.buscarPorId(projetoId);
    if (!projeto) {
      throw new Error(`Projeto ${projetoId} não encontrado.`);
    }

    if (novoOrcamento !== undefined) {
      projeto.orcamento = novoOrcamento;
    }
    if (novoPrazo !== undefined) {
      projeto.prazo = novoPrazo;
    }
    await this.projetoRepository.salvar(projeto);
    if (process.env.RABBITMQ_URL) {
      await publicarComandoProjeto("projeto.atualizado", {
        projetoId,
        projeto: {
          id: projeto.id,
          genero: projeto.genero,
          duracao: projeto.duracao,
          orcamento: projeto.orcamento,
          prazo: projeto.prazo,
          tipoCaptacao: projeto.tipoCaptacao,
          localizacao: projeto.localizacao,
          papeisObrigatorios: projeto.papeisObrigatorios,
        },
      });
    }

    const recomendacoes = await this.gerarRecomendacoes(projeto);

    this.emissor.notificar(
      new EventoRecomendacao("recomendacao_gerada", {
        projetoId,
        mensagem: "Reavaliação completa da equipe solicitada pelo produtor.",
      }),
    );

    return recomendacoes;
  }
}
