import Projeto from "./Projeto.js";

export default class ProjetoAnimacao extends Projeto {
  public clonar(): ProjetoAnimacao {
    const copia = new ProjetoAnimacao(
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
