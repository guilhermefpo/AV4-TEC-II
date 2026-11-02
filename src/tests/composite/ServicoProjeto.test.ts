import { describe, expect, it } from "vitest";
import { PacoteServico, ServicoAtomico } from "../../composite/ServicoProjeto.js";
import { Papel } from "../../enum/Papel.js";
import Projeto from "../../entities/Projeto.js";

describe("Composite de serviços", () => {
  it("soma custo e prazo em hierarquias e valida folhas recursivamente", () => {
    const pacote = new PacoteServico("Pós-produção", [
      new ServicoAtomico("Edição", 1000, 4, Papel.EDITOR),
      new PacoteServico("Áudio", [new ServicoAtomico("Mixagem", 500, 2, Papel.SONOPLASTA)]),
    ]);
    expect(pacote.calcularCusto()).toBe(1500);
    expect(pacote.obterPrazo()).toBe(6);
    expect(pacote.validar()).toBe(true);
    expect(pacote.listarSubservicos()).toHaveLength(2);
  });

  it("mantem o servico no campo de persistencia do projeto e clona a arvore", () => {
    const servico = new PacoteServico("Pacote", [new ServicoAtomico("Edicao", 250, 3, Papel.EDITOR)]);
    const projeto = new Projeto("p", "ficcao", 10, 1000, new Date(), "digital", "SP", [], undefined, servico);
    const persistido = (projeto as unknown as { servicoPrincipalPersistido: unknown }).servicoPrincipalPersistido;
    const recarregado = Object.assign(new Projeto(), { duracao: 10, orcamento: 1000, servicoPrincipalPersistido: persistido }) as unknown as Projeto;
    const copia = projeto.clonar();
    expect(recarregado.calcularCustoTotal()).toBe(250);
    expect(copia.calcularCustoTotal()).toBe(250);
    expect(copia.servicoPrincipal).not.toBe(projeto.servicoPrincipal);
    expect(recarregado.validarServicos()).toBe(true);
  });
});
