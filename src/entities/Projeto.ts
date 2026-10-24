import { Entity, PrimaryColumn, Column } from "typeorm";
import type { ElementoProjeto } from "../interface/ElementoProjeto.js";
import type VisitanteProjeto from "../interface/VisitanteProjeto.js";
import { Papel } from "../enum/Papel.js";
import type Equipe from "./Equipe.js";
import type Competencia from "./Competencia.js";
import {
  desserializarServico,
  serializarServico,
  type ServicoPersistido,
  type ServicoProjeto,
} from "../composite/ServicoProjeto.js";

export interface PapelObrigatorio {
  papel: Papel;
  peso: number;
  competenciasDesejadas: Competencia[];
}

@Entity("projetos")
export default class Projeto implements ElementoProjeto {
  @PrimaryColumn({ type: "varchar" })
  id: string;

  @Column({ type: "varchar" })
  genero: string;

  @Column({ type: "int" })
  duracao: number;

  @Column({ type: "float" })
  orcamento: number;

  @Column({ type: "timestamp" })
  prazo: Date;

  @Column({ type: "varchar" })
  tipoCaptacao: string;

  @Column({ type: "varchar" })
  localizacao: string;

  @Column({ type: "simple-json", default: "[]" })
  papeisObrigatorios: PapelObrigatorio[];

  @Column({ type: "simple-json", nullable: true })
  private servicoPrincipalPersistido?: ServicoPersistido | null;

  equipe?: Equipe | undefined;
  private servicoPrincipalEmMemoria: ServicoProjeto | undefined;

  constructor(
    id: string = "",
    genero: string = "",
    duracao: number = 0,
    orcamento: number = 0,
    prazo: Date = new Date(),
    tipoCaptacao: string = "",
    localizacao: string = "",
    papeisObrigatorios: PapelObrigatorio[] = [],
    equipe?: Equipe | undefined,
    servicoPrincipal?: ServicoProjeto | undefined,
  ) {
    this.id = id;
    this.genero = genero;
    this.duracao = duracao;
    this.orcamento = orcamento;
    this.prazo = prazo;
    this.tipoCaptacao = tipoCaptacao;
    this.localizacao = localizacao;
    this.papeisObrigatorios = papeisObrigatorios;
    this.equipe = equipe;
    this.servicoPrincipal = servicoPrincipal;
  }

  get servicoPrincipal(): ServicoProjeto | undefined {
    if (this.servicoPrincipalEmMemoria) return this.servicoPrincipalEmMemoria;
    if (!this.servicoPrincipalPersistido) return undefined;
    this.servicoPrincipalEmMemoria = desserializarServico(
      this.servicoPrincipalPersistido,
    );
    return this.servicoPrincipalEmMemoria;
  }

  set servicoPrincipal(servico: ServicoProjeto | undefined) {
    this.servicoPrincipalEmMemoria = servico;
    this.servicoPrincipalPersistido = servico
      ? serializarServico(servico)
      : null;
  }

  public calcularCustoTotal(): number {
    return this.servicoPrincipal?.calcularCusto() ?? 0;
  }

  public validarServicos(): boolean {
    return this.servicoPrincipal
      ? this.servicoPrincipal.validar() &&
          this.servicoPrincipal.calcularCusto() <= this.orcamento &&
          this.servicoPrincipal.obterPrazo() <= this.duracao
      : true;
  }

  public clonarServicoPrincipal(): ServicoProjeto | undefined {
    return this.servicoPrincipal
      ? clonarServico(this.servicoPrincipal)
      : undefined;
  }

  public aceitar(visitante: VisitanteProjeto): void {
    visitante.visitarProjeto(this);
    this.equipe?.aceitar(visitante);
  }

  public clonar(): Projeto {
    return new Projeto(
      this.id,
      this.genero,
      this.duracao,
      this.orcamento,
      new Date(this.prazo),
      this.tipoCaptacao,
      this.localizacao,
      this.papeisObrigatorios.map((papel) => ({
        papel: papel.papel,
        peso: papel.peso,
        competenciasDesejadas: papel.competenciasDesejadas.map(
          (competencia) => ({ ...competencia }),
        ),
      })),
      undefined,
      this.clonarServicoPrincipal(),
    );
  }
}

function clonarServico(servico: ServicoProjeto): ServicoProjeto {
  return desserializarServico(serializarServico(servico));
}
