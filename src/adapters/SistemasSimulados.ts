import type Profissional from "../entities/Profissional.js";

export class S3Simulado {
  readonly objetos = new Map<string, string>();
  async putObject(key: string, body: string): Promise<string> {
    this.objetos.set(key, body);
    return `s3://cinebridge/${key}`;
  }
}
export class GoogleCloudSimulado {
  readonly objetos = new Map<string, string>();
  async save(bucket: string, key: string, body: string): Promise<string> {
    this.objetos.set(`${bucket}/${key}`, body);
    return `gs://${bucket}/${key}`;
  }
}
export class StripeSimulado {
  async createPaymentIntent(amount: number, currency: string) {
    return { id: `pi_${Date.now()}`, status: "succeeded", amount, currency };
  }
}
export class PagSeguroSimulado {
  async criarCobranca(valorCentavos: number, moeda: string) {
    return { codigo: `ps_${Date.now()}`, situacao: "paga", valorCentavos, moeda };
  }
}
export class LinkedInSimulado {
  constructor(private readonly perfis: Profissional[] = []) {}
  async buscarPerfis(): Promise<Profissional[]> { return this.perfis; }
}
export class CadastroInternoSimulado {
  constructor(private readonly perfis: Profissional[] = []) {}
  async listarProfissionais(): Promise<Profissional[]> { return this.perfis; }
}
