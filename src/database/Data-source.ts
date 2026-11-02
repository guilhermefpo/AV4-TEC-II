import "reflect-metadata";
import { DataSource } from "typeorm";
import Profissional from "../entities/Profissional.js";
import Projeto from "../entities/Projeto.js";
import Equipe from "../entities/Equipe.js";
import Convite from "../entities/Convite.js";

const serviceEntities =
  process.env.SERVICE_NAME === "profissionais"
    ? [Profissional]
    : process.env.SERVICE_NAME === "notificacoes"
      ? []
      : process.env.SERVICE_NAME === "api"
        ? [Projeto, Equipe, Convite]
        : [Profissional, Projeto, Equipe, Convite];

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? "cinebridge",
  password: process.env.DB_PASSWORD ?? "cinebridge",
  database: process.env.DB_NAME ?? "cinebridge",
  synchronize: process.env.DB_SYNCHRONIZE !== "false",
  logging: false,
  entities: serviceEntities,
});
