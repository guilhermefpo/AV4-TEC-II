import { describe, expect, it } from "vitest";
import { AdaptadorGoogleCloud, AdaptadorInterno, AdaptadorLinkedIn, AdaptadorPagSeguro, AdaptadorS3, AdaptadorStripe } from "../../adapters/Adaptadores.js";
import { CadastroInternoSimulado, GoogleCloudSimulado, LinkedInSimulado, PagSeguroSimulado, S3Simulado, StripeSimulado } from "../../adapters/SistemasSimulados.js";
import Profissional from "../../entities/Profissional.js";

describe("Adapter", () => {
  it("mantém o contrato de armazenamento ao trocar o provedor", async () => {
    const s3 = new S3Simulado();
    const google = new GoogleCloudSimulado();
    expect(await new AdaptadorS3(s3).armazenar("a.mp4", "dados")).toMatch(/^s3:/);
    expect(await new AdaptadorGoogleCloud(google).armazenar("a.mp4", "dados")).toMatch(/^gs:/);
    expect(s3.objetos.get("a.mp4")).toBe("dados");
    expect(google.objetos.get("cinebridge/a.mp4")).toBe("dados");
  });

  it("normaliza respostas dos gateways de pagamento", async () => {
    const stripe = await new AdaptadorStripe(new StripeSimulado()).cobrar(12.5);
    const pagSeguro = await new AdaptadorPagSeguro(new PagSeguroSimulado()).cobrar(12.5);
    expect(stripe.status).toBe("succeeded");
    expect(pagSeguro.status).toBe("paga");
    expect(stripe.id).toBeTruthy();
    expect(pagSeguro.id).toBeTruthy();
  });

  it("normaliza a importacao de diferentes fontes de profissionais", async () => {
    const perfil = Profissional.criar({ id: "p1", nome: "Ana" });
    expect(await new AdaptadorLinkedIn(new LinkedInSimulado([perfil])).importar()).toEqual([perfil]);
    expect(await new AdaptadorInterno(new CadastroInternoSimulado([perfil])).importar()).toEqual([perfil]);
  });
});
