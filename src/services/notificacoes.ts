import { obterCanal, fecharRabbitMq } from "../messaging/RabbitMq.js";
import { iniciarHealthcheck } from "./health.js";
import { AppDataSource } from "../database/Data-source.js";

async function iniciar() {
  await AppDataSource.initialize();
  await AppDataSource.query("CREATE TABLE IF NOT EXISTS notification_events (id BIGSERIAL PRIMARY KEY, tipo TEXT NOT NULL, dados JSONB NOT NULL, ocorrido_em TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  const channel = await obterCanal();
  iniciarHealthcheck(true);
  await channel.assertQueue("eventos-projetos", { durable: true });
  await channel.consume("eventos-projetos", async (mensagem) => {
    if (!mensagem) return;
    try {
      const evento = JSON.parse(mensagem.content.toString()) as { tipo: string; dados: unknown };
      await AppDataSource.query("INSERT INTO notification_events (tipo, dados) VALUES ($1, $2::jsonb)", [evento.tipo, JSON.stringify(evento.dados)]);
      console.log(JSON.stringify({ servico: "notificacoes", evento: evento.tipo, dados: evento.dados }));
      channel.ack(mensagem);
    } catch (erro) {
      console.error("Evento inválido", erro);
      channel.nack(mensagem, false, false);
    }
  });
  console.log("Consumidor de notificações pronto.");
}

void iniciar().catch(async (erro) => { console.error(erro); await fecharRabbitMq(); process.exit(1); });
