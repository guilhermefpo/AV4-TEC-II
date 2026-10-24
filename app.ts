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
