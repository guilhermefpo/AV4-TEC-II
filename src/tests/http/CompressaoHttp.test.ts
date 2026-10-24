import { afterAll, describe, expect, it } from "vitest";
import { fastify } from "fastify";
import { gunzipSync } from "node:zlib";
import { registrarCompressaoHttp } from "../../utils/CompressaoHttp.js";

describe("compressao HTTP", () => {
  const app = fastify();
  registrarCompressaoHttp(app, 0);
  app.get("/payload", async () => ({ dados: "cinebridge ".repeat(100) }));
  afterAll(async () => app.close());

  it("envia gzip para clientes que anunciam suporte", async () => {
    const response = await app.inject({ method: "GET", url: "/payload", headers: { "accept-encoding": "gzip" } });
    expect(response.headers["content-encoding"]).toBe("gzip");
    expect(JSON.parse(gunzipSync(response.rawPayload).toString("utf8")).dados).toBe("cinebridge ".repeat(100));
  });

  it("preserva JSON quando gzip nao e aceito", async () => {
    const response = await app.inject({ method: "GET", url: "/payload", headers: { "accept-encoding": "identity" } });
    expect(response.headers["content-encoding"]).toBeUndefined();
    expect(response.json().dados).toBe("cinebridge ".repeat(100));
  });
});
