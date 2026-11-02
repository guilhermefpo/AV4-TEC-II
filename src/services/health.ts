import { createServer } from "node:http";
import { obterCanal } from "../messaging/RabbitMq.js";

export function iniciarHealthcheck(verificarBanco = false): void {
  const port = Number(process.env.HEALTH_PORT ?? 3000);
  createServer(async (request, response) => {
    if (request.url !== "/health") { response.writeHead(404).end(); return; }
    try {
      if (verificarBanco) await (await import("../database/Data-source.js")).AppDataSource.query("SELECT 1");
      const channel = await obterCanal();
      await channel.assertQueue("health-check", { durable: false });
      response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ status: "ok" }));
    } catch {
      response.writeHead(503, { "content-type": "application/json" }).end(JSON.stringify({ status: "indisponivel" }));
    }
  }).listen(port, "0.0.0.0");
}
