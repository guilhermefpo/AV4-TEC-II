import "reflect-metadata";
import { AppDataSource } from "./src/database/Data-source.js";
import { buildApp } from "./app.js";

async function main() {
  await AppDataSource.initialize();
  console.log("Conectado ao PostgreSQL.");

  const app = buildApp();
  const port = Number(process.env.PORT ?? 3333);

  await app.listen({ port, host: "0.0.0.0" });
  console.log(`HTTP server running on http://localhost:${port}`);
  console.log(`Docs available at http://localhost:${port}/docs`);
}

main().catch((erro) => {
  console.error("Falha ao iniciar o servidor:", erro);
  process.exit(1);
});
