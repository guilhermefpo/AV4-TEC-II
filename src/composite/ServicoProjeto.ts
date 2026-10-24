import { Papel } from "../enum/Papel.js";

export interface ServicoProjeto {
  calcularCusto(): number;
  listarSubservicos(): ServicoProjeto[];
  obterPrazo(): number;
  validar(): boolean;
}

export type ServicoPersistido =
  | { tipo: "atomico"; nome: string; custo: number; prazoDias: number; papel: Papel }
  | { tipo: "pacote"; nome: string; servicos: ServicoPersistido[] };

export class ServicoAtomico implements ServicoProjeto {
  constructor(public readonly nome: string, private readonly custo: number,
    private readonly prazoDias: number, public readonly papel: Papel) {}
  calcularCusto(): number { return this.custo; }
  listarSubservicos(): ServicoProjeto[] { return []; }
  obterPrazo(): number { return this.prazoDias; }
  validar(): boolean { return this.custo >= 0 && this.prazoDias > 0 && Object.values(Papel).includes(this.papel); }
}

export class PacoteServico implements ServicoProjeto {
  private readonly filhos: ServicoProjeto[] = [];
  constructor(public readonly nome: string, servicos: ServicoProjeto[] = []) { this.filhos.push(...servicos); }
  adicionar(servico: ServicoProjeto): void { this.filhos.push(servico); }
  remover(servico: ServicoProjeto): void { const i = this.filhos.indexOf(servico); if (i >= 0) this.filhos.splice(i, 1); }
  calcularCusto(): number { return this.filhos.reduce((total, s) => total + s.calcularCusto(), 0); }
  listarSubservicos(): ServicoProjeto[] { return [...this.filhos]; }
  obterPrazo(): number { return this.filhos.reduce((total, s) => total + s.obterPrazo(), 0); }
  validar(): boolean { return this.filhos.length > 0 && this.filhos.every((s) => s.validar()); }
}

export function serializarServico(servico: ServicoProjeto): ServicoPersistido {
  const filhos = servico.listarSubservicos();
  const nome = (servico as ServicoProjeto & { nome?: string }).nome ?? "servico";
  if (servico instanceof PacoteServico) {
    return { tipo: "pacote", nome, servicos: filhos.map(serializarServico) };
  }
  if (filhos.length === 0) {
    const atomico = servico as ServicoProjeto & { papel?: Papel };
    if (!atomico.papel || !Object.values(Papel).includes(atomico.papel)) {
      throw new Error("Servico atomico sem papel tecnico valido.");
    }
    return { tipo: "atomico", nome, custo: servico.calcularCusto(), prazoDias: servico.obterPrazo(), papel: atomico.papel };
  }
  return { tipo: "pacote", nome, servicos: filhos.map(serializarServico) };
}

export function desserializarServico(dados: ServicoPersistido): ServicoProjeto {
  if (dados.tipo === "atomico") return new ServicoAtomico(dados.nome, dados.custo, dados.prazoDias, dados.papel);
  return new PacoteServico(dados.nome, dados.servicos.map(desserializarServico));
}

