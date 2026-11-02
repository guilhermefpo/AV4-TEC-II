import amqp, { type ChannelModel, type ConfirmChannel, type ConsumeMessage } from "amqplib";
import { randomUUID } from "node:crypto";

let connection: ChannelModel | undefined;
let channel: ConfirmChannel | undefined;

export async function obterCanal(): Promise<ConfirmChannel> {
  if (channel) return channel;
  const url = process.env.RABBITMQ_URL ?? "amqp://guest:guest@localhost:5672";
  let ultimoErro: unknown;
  for (let tentativa = 1; tentativa <= 30; tentativa += 1) {
    try {
      const connected = await amqp.connect(url);
      const confirmedChannel = await connected.createConfirmChannel();
      connection = connected;
      channel = confirmedChannel;
      connected.on("error", (erro) => {
        console.error("Conexão com RabbitMQ interrompida", erro);
      });
      connected.on("close", () => {
        if (connection !== connected) return;
        connection = undefined;
        channel = undefined;
        if (process.env.SERVICE_NAME && process.env.SERVICE_NAME !== "api") {
          console.error("Conexão com RabbitMQ encerrada; o consumidor será reiniciado pelo Compose.");
          process.exit(1);
        }
      });
      return confirmedChannel;
    } catch (erro) {
      ultimoErro = erro;
      if (tentativa === 30) break;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw ultimoErro;
}

export async function publicarComandoProjeto(tipo: string, dados: unknown): Promise<void> {
  const ch = await obterCanal();
  await ch.assertQueue("comandos-projetos", { durable: true });
  ch.sendToQueue("comandos-projetos", Buffer.from(JSON.stringify({ tipo, dados })), { persistent: true });
  await ch.waitForConfirms();
}

export async function requisitarProfissionais(operacao: string, dados?: unknown, timeoutMs = 5000): Promise<unknown> {
  const ch = await obterCanal();
  await ch.assertQueue("consulta-profissionais", { durable: true });
  const resposta = await ch.assertQueue("", { exclusive: true, autoDelete: true });
  const correlationId = randomUUID();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      void ch.cancel(correlationId).catch(() => undefined);
      void ch.deleteQueue(resposta.queue).catch(() => undefined);
      reject(new Error("Tempo esgotado ao consultar profissionais via RabbitMQ."));
    }, timeoutMs);
    void ch.consume(resposta.queue, (msg: ConsumeMessage | null) => {
      if (!msg || msg.properties.correlationId !== correlationId) return;
      clearTimeout(timer);
      void ch.ack(msg);
      void ch.cancel(correlationId).catch(() => undefined);
      void ch.deleteQueue(resposta.queue).catch(() => undefined);
      try { resolve(JSON.parse(msg.content.toString()) as unknown); } catch (erro) { reject(erro); }
    }, { noAck: false, consumerTag: correlationId }).then(() => {
      ch.sendToQueue("consulta-profissionais", Buffer.from(JSON.stringify({ operacao, dados })), { persistent: true, correlationId, replyTo: resposta.queue });
      return ch.waitForConfirms();
    }).catch((erro: unknown) => { clearTimeout(timer); reject(erro); });
  });
}

export async function consultarProfissionais(timeoutMs = 5000): Promise<unknown[]> {
  return await requisitarProfissionais("listarDisponiveis", undefined, timeoutMs) as unknown[];
}

export async function fecharRabbitMq(): Promise<void> {
  await channel?.close();
  await connection?.close();
  channel = undefined;
  connection = undefined;
}
