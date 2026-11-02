import "reflect-metadata";
import { AppDataSource } from "../database/Data-source.js";
import Profissional from "../entities/Profissional.js";
import { obterCanal, fecharRabbitMq } from "../messaging/RabbitMq.js";
import { iniciarHealthcheck } from "./health.js";

async function iniciar() {
  await AppDataSource.initialize();
  iniciarHealthcheck(true);
  const channel = await obterCanal();
  await channel.assertQueue("consulta-profissionais", { durable: true });
  channel.prefetch(10);
  await channel.consume("consulta-profissionais", async (mensagem) => {
    if (!mensagem) return;
    try {
      const pedido = JSON.parse(mensagem.content.toString()) as { operacao: string; dados?: Profissional };
      const repo = AppDataSource.getRepository(Profissional);
      let resposta: unknown;
      if (pedido.operacao === "listarDisponiveis") resposta = await repo.findBy({ disponivel: true });
      else if (pedido.operacao === "listarTodos") resposta = await repo.find();
      else if (pedido.operacao === "buscarPorId") resposta = await repo.findOneBy({ id: pedido.dados?.id ?? "" });
      else if (pedido.operacao === "salvar" && pedido.dados) resposta = await repo.save(pedido.dados);
      else throw new Error(`Operação não suportada: ${pedido.operacao}`);
      if (mensagem.properties.replyTo) {
        channel.sendToQueue(mensagem.properties.replyTo, Buffer.from(JSON.stringify(resposta)), {
          correlationId: mensagem.properties.correlationId,
          persistent: false,
        });
        await channel.waitForConfirms();
      }
      channel.ack(mensagem);
    } catch (erro) {
      console.error("Falha ao processar consulta de profissionais", erro);
      channel.nack(mensagem, false, false);
    }
  });
  console.log("Consumidor de profissionais pronto.");
}

void iniciar().catch(async (erro) => { console.error(erro); await fecharRabbitMq(); process.exit(1); });
