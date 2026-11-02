import { fastify } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  jsonSchemaTransform,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { fastifySwagger } from "@fastify/swagger";
import { fastifyCors } from "@fastify/cors";
import ScalarApiReference from "@scalar/fastify-api-reference";
import projetoRoutes from "./src/routes/projetoRoutes.js";
import conviteRoutes from "./src/routes/conviteRoutes.js";
import profissionalRoutes from "./src/routes/profissionalRoutes.js";
import relatorioRoutes from "./src/routes/relatorioRoutes.js";
import equipeRoutes from "./src/routes/equipeRoutes.js";
import { registrarCompressaoHttp } from "./src/utils/CompressaoHttp.js";

export function buildApp() {
  const app = fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

  app.get("/health", async (_request, reply) => {
    const banco = (await import("./src/database/Data-source.js")).AppDataSource;
    if (!banco.isInitialized)
      return reply.code(503).send({ status: "indisponivel" });
    try {
      await banco.query("SELECT 1");
      if (process.env.RABBITMQ_URL)
        await (await import("./src/messaging/RabbitMq.js")).obterCanal();
      return { status: "ok", database: "ok" };
    } catch {
      return reply.code(503).send({ status: "indisponivel", database: "erro" });
    }
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registrarCompressaoHttp(app);

  app.register(fastifyCors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  });

  app.register(fastifySwagger, {
    openapi: {
      info: {
        title: "Software Cinebridge",
        description: "Microsserviço de recomendação e orquestração de equipes.",
        version: "3.0.0",
      },
    },
    transform: jsonSchemaTransform,
  });

  app.register(ScalarApiReference, { routePrefix: "/docs" });

  app.register(projetoRoutes);
  app.register(conviteRoutes);
  app.register(profissionalRoutes);
  app.register(relatorioRoutes);
  app.register(equipeRoutes);

  return app;
}
