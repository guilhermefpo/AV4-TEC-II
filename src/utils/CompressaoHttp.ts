import { gzipSync } from "node:zlib";
import { Buffer } from "node:buffer";
import type { FastifyInstance } from "fastify";

export function registrarCompressaoHttp(app: FastifyInstance, limiteBytes = 256): void {
  app.addHook("onSend", (request, reply, payload, done) => {
    const aceitaGzip = request.headers["accept-encoding"]
      ?.split(",")
      .some((codificacao) => /^\s*gzip\s*(;\s*q=(?!0(?:\.0*)?\s*(?:;|$))[^;]+)?\s*$/i.test(codificacao));
    if (!aceitaGzip || (typeof payload !== "string" && !Buffer.isBuffer(payload))) {
      done(null, payload);
      return;
    }

    const corpo = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
    if (corpo.byteLength < limiteBytes) {
      done(null, payload);
      return;
    }

    const variacao = reply.getHeader("vary");
    reply.header("vary", variacao ? `${variacao}, Accept-Encoding` : "Accept-Encoding");
    reply.header("content-encoding", "gzip");
    reply.removeHeader("content-length");
    done(null, gzipSync(corpo));
  });
}
