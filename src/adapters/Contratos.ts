import type Profissional from "../entities/Profissional.js";

export interface AdaptadorArmazenamento {
  armazenar(chave: string, conteudo: string): Promise<string>;
}
export interface AdaptadorPagamento {
  cobrar(valor: number, moeda?: string): Promise<{ id: string; status: string }>;
}
export interface AdaptadorProfissional {
  importar(): Promise<Profissional[]>;
}
