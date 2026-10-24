import type Profissional from "../entities/Profissional.js";
import type { AdaptadorArmazenamento, AdaptadorPagamento, AdaptadorProfissional } from "./Contratos.js";
import { CadastroInternoSimulado, GoogleCloudSimulado, LinkedInSimulado, PagSeguroSimulado, S3Simulado, StripeSimulado } from "./SistemasSimulados.js";

export class AdaptadorS3 implements AdaptadorArmazenamento {
  constructor(private readonly api = new S3Simulado()) {}
  armazenar(chave: string, conteudo: string) { return this.api.putObject(chave, conteudo); }
}
export class AdaptadorGoogleCloud implements AdaptadorArmazenamento {
  constructor(private readonly api = new GoogleCloudSimulado(), private readonly bucket = "cinebridge") {}
  armazenar(chave: string, conteudo: string) { return this.api.save(this.bucket, chave, conteudo); }
}
export class AdaptadorStripe implements AdaptadorPagamento {
  constructor(private readonly api = new StripeSimulado()) {}
  async cobrar(valor: number, moeda = "brl") {
    const r = await this.api.createPaymentIntent(Math.round(valor * 100), moeda);
    return { id: r.id, status: r.status };
  }
}
export class AdaptadorPagSeguro implements AdaptadorPagamento {
  constructor(private readonly api = new PagSeguroSimulado()) {}
  async cobrar(valor: number, moeda = "BRL") {
    const r = await this.api.criarCobranca(Math.round(valor * 100), moeda);
    return { id: r.codigo, status: r.situacao };
  }
}
export class AdaptadorLinkedIn implements AdaptadorProfissional {
  constructor(private readonly api = new LinkedInSimulado()) {}
  importar(): Promise<Profissional[]> { return this.api.buscarPerfis(); }
}
export class AdaptadorInterno implements AdaptadorProfissional {
  constructor(private readonly api = new CadastroInternoSimulado()) {}
  importar(): Promise<Profissional[]> { return this.api.listarProfissionais(); }
}
