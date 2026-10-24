import OrquestradorEquipe from "./OrquestradorEquipe.js";
import type Projeto from "../entities/Projeto.js";
import type Recomendacao from "../entities/Recomendacao.js";
import type FabricaProjeto from "../factory/FabricaProjeto.js";

export default class OrquestradorPadrao extends OrquestradorEquipe {
  protected normalizarEntrada(projeto: Projeto): Projeto {
    return projeto;
  }

  constructor(estrategia?: import("../strategy/RecomendacaoStrategy.js").default, fabrica?: FabricaProjeto) {
    super(estrategia, fabrica);
  }

  protected validarRestricoesOrcamentarias(projeto: Projeto): void {
    if (projeto.orcamento <= 0) {
      throw new Error("Orçamento do projeto deve ser maior que zero.");
    }
  }

  protected posProcessarRecomendacoes(
    recomendacoes: Recomendacao[],
  ): Recomendacao[] {
    return recomendacoes;
  }
}
