import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "../config/env.js";

const isProd = env.NODE_ENV === "production";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: env.DATABASE_URL,
  synchronize: true, // dev only — use migrations in prod
  logging: false,
  entities: isProd
    ? ["./backend/dist/modules/**/*.entity.js"]
    : ["./src/modules/**/*.entity.ts"],
  migrations: isProd
    ? ["./backend/dist/migrations/*.js"]
    : ["./src/migrations/*.ts"],
});
