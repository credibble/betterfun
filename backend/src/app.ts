import express from "express";
import cors from "cors";
import { type DataSource } from "typeorm";
import { logger } from "./lib/logger.js";
import { buildAuthRoutes } from "./modules/auth/auth.routes.js";
import { buildTraderRoutes } from "./modules/traders/trader.routes.js";
import { buildLiveKitRoutes } from "./modules/livekit/livekit.routes.js";
import { buildFaucetRoutes } from "./modules/faucet/faucet.routes.js";
import { buildCommentRoutes } from "./modules/comments/comment.routes.js";
import { buildUploadRoutes } from "./modules/upload/upload.routes.js";
import { buildDemoRoutes } from "./modules/demo/demo.routes.js";

export function buildApp(dataSource: DataSource) {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  // Health check
  app.get("/health", (_req, res) => res.json({ ok: true }));

  // Mount routes
  app.use("/auth", buildAuthRoutes(dataSource));
  app.use("/traders", buildTraderRoutes(dataSource));
  app.use("/livekit", buildLiveKitRoutes());
  app.use("/faucet", buildFaucetRoutes());
  app.use("/upload", buildUploadRoutes());
  app.use("/comments", buildCommentRoutes(dataSource));
  app.use("/demo", buildDemoRoutes());

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
