import { gzipSync } from "node:zlib";
import { Buffer } from "node:buffer";
import type Projeto from "../entities/Projeto.js";
import type Profissional from "../entities/Profissional.js";
import Recomendacao from "../entities/Recomendacao.js";
import type { Papel } from "../enum/Papel.js";
import type RecomendacaoStrategy from "./RecomendacaoStrategy.js";

export class CacheDecorator implements RecomendacaoStrategy {
  private readonly cache = new Map<string, Recomendacao>();
  constructor(private readonly interno: RecomendacaoStrategy) {}
  recomendar(projeto: Projeto, papel: Papel, profissionais: Profissional[]): Recomendacao {
    const chave = JSON.stringify([projeto.id, papel, projeto.orcamento, projeto.papeisObrigatorios, profissionais.map((p) => [p.id, p.disponivel, p.precoMedio, p.competencias, p.avaliacoes])]);
    const guardado = this.cache.get(chave);
    if (guardado) return guardado;
    const resultado = this.interno.recomendar(projeto, papel, profissionais);
    this.cache.set(chave, resultado);
    return resultado;
  }
}

export class AuditoriaDecorator implements RecomendacaoStrategy {
  readonly registros: Array<{ projetoId: string; papel: Papel; duracaoMs: number; totalSugestoes: number }> = [];
  constructor(private readonly interno: RecomendacaoStrategy, private readonly registrar: (registro: AuditoriaDecorator["registros"][number]) => void = (r) => console.info(JSON.stringify({ evento: "recomendacao_auditada", ...r }))) {}
  recomendar(projeto: Projeto, papel: Papel, profissionais: Profissional[]): Recomendacao {
    const inicio = Date.now();
    let totalSugestoes = 0;
    try {
      const resultado = this.interno.recomendar(projeto, papel, profissionais);
      totalSugestoes = resultado.sugestoes.length;
      return resultado;
    }
    finally {
      const registro = { projetoId: projeto.id, papel, duracaoMs: Date.now() - inicio, totalSugestoes };
      this.registros.push(registro); this.registrar(registro);
    }
  }
}

export class CompressaoDecorator implements RecomendacaoStrategy {
  ultimaCompressao = { bytesOriginais: 0, bytesComprimidos: 0 };
  constructor(private readonly interno: RecomendacaoStrategy) {}
  recomendar(projeto: Projeto, papel: Papel, profissionais: Profissional[]): Recomendacao {
    const resultado = this.interno.recomendar(projeto, papel, profissionais);
    const serializado = JSON.stringify(resultado.sugestoes.map(({ profissional, score }) => ({ profissionalId: profissional.id, score })));
    this.ultimaCompressao = { bytesOriginais: Buffer.byteLength(serializado), bytesComprimidos: gzipSync(serializado).byteLength };
    return resultado;
  }
}

export type DecoradorRecomendacao = "cache" | "auditoria" | "compressao";
export function decorarRecomendador(base: RecomendacaoStrategy, pilha: DecoradorRecomendacao[]): RecomendacaoStrategy {
  return pilha.reduce<RecomendacaoStrategy>((atual, tipo) => {
    switch (tipo) {
      case "cache": return new CacheDecorator(atual);
      case "auditoria": return new AuditoriaDecorator(atual);
      case "compressao": return new CompressaoDecorator(atual);
    }
  }, base);
}
