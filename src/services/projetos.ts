import { obterCanal, fecharRabbitMq } from "../messaging/RabbitMq.js";
import { iniciarHealthcheck } from "./health.js";
import { AppDataSource } from "../database/Data-source.js";

async function iniciar() {
  await AppDataSource.initialize();
  await AppDataSource.query("CREATE TABLE IF NOT EXISTS project_events (id BIGSERIAL PRIMARY KEY, tipo TEXT NOT NULL, dados JSONB NOT NULL, ocorrido_em TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  await AppDataSource.query("CREATE TABLE IF NOT EXISTS project_records (projeto_id TEXT PRIMARY KEY, dados JSONB NOT NULL, atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  const channel = await obterCanal();
  iniciarHealthcheck(true);
  await channel.assertQueue("comandos-projetos", { durable: true });
  await channel.assertQueue("eventos-projetos", { durable: true });
  await channel.consume("comandos-projetos", async (mensagem) => {
    if (!mensagem) return;
    try {
      const evento = JSON.parse(mensagem.content.toString()) as { tipo: string; dados: unknown };
      if (evento.tipo === "projeto.criado" || evento.tipo === "projeto.atualizado") {
        const dados = evento.dados as { projetoId?: string };
        if (dados.projetoId) await AppDataSource.query(
          "INSERT INTO project_records (projeto_id, dados) VALUES ($1, $2::jsonb) ON CONFLICT (projeto_id) DO UPDATE SET dados = project_records.dados || EXCLUDED.dados, atualizado_em = NOW()",
          [dados.projetoId, JSON.stringify(evento.dados)],
        );
      }
      await AppDataSource.query("INSERT INTO project_events (tipo, dados) VALUES ($1, $2::jsonb)", [evento.tipo, JSON.stringify(evento.dados)]);
      channel.sendToQueue("eventos-projetos", Buffer.from(JSON.stringify({ ...evento, ocorridoEm: new Date().toISOString() })), { persistent: true });
      await channel.waitForConfirms();
      channel.ack(mensagem);
    } catch (erro) {
      console.error("Falha ao processar comando de projeto", erro);
      channel.nack(mensagem, false, true);
    }
  });
  console.log("Consumidor de comandos de projetos pronto.");
}

void iniciar().catch(async (erro) => { console.error(erro); await fecharRabbitMq(); process.exit(1); });
