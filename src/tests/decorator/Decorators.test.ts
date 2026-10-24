import { describe, expect, it, vi } from "vitest";
import Projeto from "../../entities/Projeto.js";
import Profissional from "../../entities/Profissional.js";
import { Papel } from "../../enum/Papel.js";
import Recomendacao from "../../entities/Recomendacao.js";
import type RecomendacaoStrategy from "../../strategy/RecomendacaoStrategy.js";
import { AuditoriaDecorator, CacheDecorator, CompressaoDecorator, decorarRecomendador } from "../../strategy/Decorators.js";

describe("Decorators de recomendação", () => {
  const projeto = new Projeto("p", "documentário", 10, 100, new Date(), "digital", "SP", []);
  const profissional = Profissional.criar({ id: "prof-1", nome: "Ana" });
  const base: RecomendacaoStrategy = { recomendar: vi.fn(() => new Recomendacao("p", Papel.DIRETOR, [{ profissional, score: 1 }])) };

  it("armazena resultados repetidos e registra auditoria", () => {
    const registrar = vi.fn();
    const auditoria = new AuditoriaDecorator(new CacheDecorator(base), registrar);
    auditoria.recomendar(projeto, Papel.DIRETOR, [profissional]);
    auditoria.recomendar(projeto, Papel.DIRETOR, [profissional]);
    expect(base.recomendar).toHaveBeenCalledTimes(1);
    expect(registrar).toHaveBeenCalledTimes(2);
    expect(auditoria.registros[0]?.totalSugestoes).toBe(1);
  });

  it("mede payload comprimido e combina decorators dinamicamente", () => {
    const muitasSugestoes = new Recomendacao("p", Papel.DIRETOR,
      Array.from({ length: 100 }, () => ({ profissional, score: 1 })));
    const recomendadorGrande: RecomendacaoStrategy = { recomendar: vi.fn(() => muitasSugestoes) };
    const compressao = new CompressaoDecorator(recomendadorGrande);
    compressao.recomendar(projeto, Papel.DIRETOR, [profissional]);
    expect(compressao.ultimaCompressao.bytesComprimidos).toBeLessThan(compressao.ultimaCompressao.bytesOriginais);
    expect(decorarRecomendador(base, ["cache", "auditoria", "compressao"])).toBeTruthy();
  });
});
