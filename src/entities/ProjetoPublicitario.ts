import Projeto from "./Projeto.js";

export default class ProjetoPublicitario extends Projeto {
  public clonar(): ProjetoPublicitario {
    const copia = new ProjetoPublicitario(
      this.id, this.genero, this.duracao, this.orcamento, new Date(this.prazo),
      this.tipoCaptacao, this.localizacao, this.papeisObrigatorios,
    );
    copia.papeisObrigatorios = this.papeisObrigatorios.map((p) => ({
      ...p, competenciasDesejadas: p.competenciasDesejadas.map((c) => ({ ...c })),
    }));
    copia.servicoPrincipal = this.clonarServicoPrincipal();
    return copia;
  }
}
