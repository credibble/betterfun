import express from "express";
import cors from "cors";
import { type DataSource } from "typeorm";
import { logger } from "./lib/logger.js";
import { buildAuthRoutes } from "./modules/auth/auth.routes.js";
import { buildTraderRoutes } from "./modules/traders/trader.routes.js";
import { buildEpochRoutes } from "./modules/epochs/epoch.routes.js";
import { buildPotRoutes } from "./modules/pots/pot.routes.js";
import { buildMarketRoutes } from "./modules/markets/market.routes.js";
import { buildTradingRoutes } from "./modules/trading/trading.routes.js";
import { buildSettlementRoutes } from "./modules/settlement/settlement.routes.js";
import { buildLiveKitRoutes } from "./modules/livekit/livekit.routes.js";
import { buildFaucetRoutes } from "./modules/faucet/faucet.routes.js";
import { buildCommentRoutes } from "./modules/comments/comment.routes.js";
import { buildDemoRoutes } from "./modules/demo/demo.routes.js";
import { buildUploadRoutes } from "./modules/upload/upload.routes.js";
import { buildVaultRoutes } from "./modules/vault/vault.routes.js";

export function buildApp(dataSource: DataSource) {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  // Health check
  app.get("/health", (_req, res) => res.json({ ok: true }));

  // Mount routes
  app.use("/auth", buildAuthRoutes(dataSource));
  app.use("/traders", buildTraderRoutes(dataSource));
  app.use("/epochs", buildEpochRoutes(dataSource));
  app.use("/pots", buildPotRoutes(dataSource));
  app.use("/markets", buildMarketRoutes(dataSource));
  app.use("/studio", buildTradingRoutes(dataSource));
  app.use("/settlement", buildSettlementRoutes(dataSource));
  app.use("/livekit", buildLiveKitRoutes());
  app.use("/faucet", buildFaucetRoutes());
  app.use("/upload", buildUploadRoutes());
  app.use("/comments", buildCommentRoutes(dataSource));

  // Vault routes (on-chain EventVault + VaultFactory reads)
  const factoryAddr = process.env.VAULT_FACTORY_ADDRESS as `0x${string}` | undefined;
  if (factoryAddr) {
    app.use("/vault", buildVaultRoutes(factoryAddr));
  }

  // Demo routes — development/testnet only
  if (process.env.NODE_ENV !== "production") {
    app.use("/demo", buildDemoRoutes(dataSource));
  }

  // Error handler
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      logger.error(err, "Unhandled request error");
      res.status(500).json({ error: "Internal server error" });
    },
  );

  return app;
}
