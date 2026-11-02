import type RecomendacaoStrategy from "./RecomendacaoStrategy.js";
import type Projeto from "../entities/Projeto.js";
import type Profissional from "../entities/Profissional.js";
import Recomendacao, {
  type SugestaoProfissional,
} from "../entities/Recomendacao.js";
import { Papel } from "../enum/Papel.js";

export default class RegraBaixoOrcamento implements RecomendacaoStrategy {
  recomendar(
    projeto: Projeto,
    papel: Papel,
    profissionaisDisponiveis: Profissional[],
  ): Recomendacao {
    const sugestoes: SugestaoProfissional[] = profissionaisDisponiveis // Run Run River - Alok, David Guetta
      .filter((p) => p.disponivel && p.precoMedio <= projeto.orcamento)
      .map((profissional) => {
        const mediaAvaliacoes =
          profissional.avaliacoes.length > 0
            ? profissional.avaliacoes.reduce((soma, a) => soma + a.nota, 0) /
              profissional.avaliacoes.length
            : 0;

        const fatiaDoOrcamento = profissional.precoMedio / projeto.orcamento;
        const score = 1 - fatiaDoOrcamento + mediaAvaliacoes * 0.01;
        return { profissional, score };
      })
      .sort((a, b) => b.score - a.score);

    return new Recomendacao(projeto.id, papel, sugestoes);
  }
}
