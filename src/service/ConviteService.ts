import Convite from "../entities/Convite.js";
import MembroEquipe from "../entities/MembroEquipe.js";
import Profissional from "../entities/Profissional.js";
import type { Papel } from "../enum/Papel.js";
import type ConviteRepository from "../repository/ConviteRepository.js";
import type EquipeRepository from "../repository/EquipeRepository.js";
import type ProfissionalRepository from "../repository/ProfissionalRepository.js";
import EmissorRecomendacao from "../observer/EmissorRecomendacao.js";
import EventoRecomendacao from "../observer/EventoRecomendacao.js";
import { gerarId } from "../utils/GeradorID.js";
import { requisitarProfissionais } from "../messaging/RabbitMq.js";

export default class ConviteService {
  constructor(
    private conviteRepository: ConviteRepository,
    private equipeRepository: EquipeRepository,
    private profissionalRepository: ProfissionalRepository,
    private emissor: EmissorRecomendacao,
  ) {}

  public async criarConvite(
    projetoId: string,
    profissionalId: string,
    papel: Papel,
  ): Promise<Convite> {
    const profissional = process.env.RABBITMQ_URL
      ? await requisitarProfissionais("buscarPorId", { id: profissionalId }) as import("../entities/Profissional.js").default | undefined
      : await this.profissionalRepository.buscarPorId(profissionalId);
    if (!profissional) {
      throw new Error(`Profissional ${profissionalId} não encontrado.`);
    }

    const convite = new Convite(gerarId("C"), projetoId, profissionalId, papel);
    await this.conviteRepository.salvar(convite);

    // notifica o profissional convidado (Observer)
    this.emissor.notificar(
      new EventoRecomendacao("recomendacao_gerada", {
        conviteId: convite.id,
        profissionalId,
        papel,
        mensagem: "Novo convite recebido para avaliação.",
      }),
    );

    return convite;
  }

  public async responderConvite(
    conviteId: string,
    aceitar: boolean,
  ): Promise<Convite> {
    const convite = await this.conviteRepository.buscarPorId(conviteId);
    if (!convite) {
      throw new Error(`Convite ${conviteId} não encontrado.`);
    }

    if (aceitar) {
      convite.aceitar();
      await this.confirmarNaEquipe(convite);
      this.emissor.notificar(
        new EventoRecomendacao("convite_aceito", {
          conviteId: convite.id,
          projetoId: convite.projetoId,
          papel: convite.papel,
        }),
      );
    } else {
      convite.recusar();
      this.emissor.notificar(
        new EventoRecomendacao("convite_recusado", {
          conviteId: convite.id,
          projetoId: convite.projetoId,
          papel: convite.papel,
          mensagem: "Nova rodada de recomendação necessária para este papel.",
        }),
      );
      // Ponto de extensão futuro: disparar nova recomendação automática
      // para este papel específico, chamando o RecomendacaoService.
    }

    await this.conviteRepository.salvar(convite);
    return convite;
  }

  private async confirmarNaEquipe(convite: Convite): Promise<void> {
    const profissionalRemoto = process.env.RABBITMQ_URL
      ? await requisitarProfissionais("buscarPorId", { id: convite.profissionalId }) as Parameters<typeof Profissional.criar>[0] | undefined
      : undefined;
    const profissional = process.env.RABBITMQ_URL
      ? profissionalRemoto ? Profissional.criar(profissionalRemoto) : undefined
      : await this.profissionalRepository.buscarPorId(convite.profissionalId);
    if (!profissional) {
      throw new Error(
        `Profissional ${convite.profissionalId} não encontrado ao confirmar equipe.`,
      );
    }

    const equipe = await this.equipeRepository.obterOuCriar(convite.projetoId);
    const membro = new MembroEquipe(convite.papel, profissional, true);
    equipe.substituirMembro(convite.papel, membro);
    await this.equipeRepository.salvar(equipe);
  }
}
