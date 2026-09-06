import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "../config/env.js";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: env.DATABASE_URL,
  synchronize: true, // dev only — use migrations in prod
  // logging: env.NODE_ENV === "development",
  logging: false,
  entities: ["./src/modules/**/*.entity.ts"],
  migrations: ["./src/migrations/*.ts"],
});
