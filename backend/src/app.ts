import express from "express";
import cors from "cors";
import { logger } from "./lib/logger.js";
import { buildLiveKitRoutes } from "./modules/livekit/livekit.routes.js";
import { buildUploadRoutes } from "./modules/upload/upload.routes.js";

export function buildApp() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  // Health check
  app.get("/health", (_req, res) => res.json({ ok: true }));

  // Mount routes (Keeper + LiveKit + Upload)
  app.use("/livekit", buildLiveKitRoutes());
  app.use("/upload", buildUploadRoutes());

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