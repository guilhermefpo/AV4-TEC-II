import type Projeto from "../entities/Projeto.js";
import type Recomendacao from "../entities/Recomendacao.js";
import type Profissional from "../entities/Profissional.js";
import type FabricaProjeto from "./FabricaProjeto.js";
import OrquestradorPadrao from "../template/OrquestradorPadrao.js";
import EventoRecomendacao from "../observer/EventoRecomendacao.js";
import type { AdaptadorArmazenamento, AdaptadorPagamento, AdaptadorProfissional } from "../adapters/Contratos.js";
import { decorarRecomendador, type DecoradorRecomendacao } from "../strategy/Decorators.js";

export default class SistemaRecomendacao {
  constructor(
    private readonly fabrica: FabricaProjeto,
    private readonly adaptadores: {
      armazenamento?: AdaptadorArmazenamento;
      pagamento?: AdaptadorPagamento;
      profissionais?: AdaptadorProfissional;
    } = {},
    private decoradores: DecoradorRecomendacao[] = [],
  ) {}

  public configurarDecoradores(pilha: DecoradorRecomendacao[]): void {
    this.decoradores = pilha;
  }

  public async armazenarArquivo(chave: string, conteudo: string): Promise<string> {
    if (!this.adaptadores.armazenamento) throw new Error("Adaptador de armazenamento não configurado.");
    return this.adaptadores.armazenamento.armazenar(chave, conteudo);
  }

  public async processarPagamento(valor: number, moeda?: string): Promise<{ id: string; status: string }> {
    if (!this.adaptadores.pagamento) throw new Error("Adaptador de pagamento não configurado.");
    return this.adaptadores.pagamento.cobrar(valor, moeda);
  }

  public async importarProfissionais(): Promise<Profissional[]> {
    if (!this.adaptadores.profissionais) throw new Error("Adaptador de profissionais não configurado.");
    return this.adaptadores.profissionais.importar();
  }

  public criarProjeto(dados: ConstructorParameters<typeof Projeto>): Projeto {
    return this.fabrica.criarProjeto(dados);
  }

  public recomendar(
    projeto: Projeto,
    profissionais: Profissional[],
  ): Recomendacao[] {
    const notificador = this.fabrica.criarNotificador();
    const orquestrador = new OrquestradorPadrao(
      decorarRecomendador(this.fabrica.criarRecomendador(), this.decoradores),
      this.fabrica,
    );
    const resultado = orquestrador.processarRecomendacao(projeto, profissionais);
    notificador.notificar(new EventoRecomendacao("recomendacao_gerada", {
      projetoId: projeto.id,
      totalPapeis: resultado.length,
    }));
    return resultado;
  }

  public validar(projeto: Projeto): boolean {
    const validador = this.fabrica.criarValidador();
    projeto.aceitar(validador);
    const resultado = validador as VisitanteComResultado;
    return typeof resultado.ehValido === "function"
      ? resultado.ehValido()
      : true;
  }
}

interface VisitanteComResultado {
  ehValido?: () => boolean;
}
