import { env } from "./config/env.js";
import { AppDataSource } from "./db/data-source.js";
import { logger } from "./lib/logger.js";
import { buildApp } from "./app.js";
import { startEpochWorker, startTradingWorker, startVerificationWorker, startAutoRedeemWorker, startVaultSyncWorker, ensureEpochSchedule } from "./modules/jobs/scheduler.js";
import { initLiveKit } from "./modules/livekit/livekit.service.js";
import { setupChatWs } from "./modules/livekit/chat-ws.js";
import { setupWsHub } from "./modules/realtime/ws-hub.js";
import { TradingService } from "./modules/trading/trading.service.js";

async function main() {
  logger.info("Starting BetterFun backend…");

  // Initialize database
  await AppDataSource.initialize();
  logger.info("Database connected");

  // One-time fix: correct avgPrice for existing down positions
  await TradingService.fixDownPositionAvgPrices(AppDataSource);

  const app = buildApp(AppDataSource);
  const server = app.listen(env.PORT, env.HOST, () => {
    logger.info(`HTTP server listening on ${env.HOST}:${env.PORT}`);
    logger.info(`  env: ${env.NODE_ENV}`);
    logger.info(`  database: ${env.DATABASE_URL.replace(/:[^@]+@/, ":***@")}`);
    logger.info(`  redis: ${env.REDIS_URL}`);
  });

  // Start BullMQ workers
  const epochWorker = startEpochWorker();
  const tradingWorker = startTradingWorker();
  const verificationWorker = startVerificationWorker();
  const autoRedeemWorker = startAutoRedeemWorker();
  const vaultSyncWorker = startVaultSyncWorker();
  logger.info("BullMQ workers started");

  // Ensure epoch schedule (create next epoch + schedule transitions)
  await ensureEpochSchedule();

  // Initialize LiveKit
  initLiveKit();

  // Setup WebSocket servers (noServer mode — we route upgrades manually)
  const chatWss = setupChatWs(server);
  const hubWss = setupWsHub(server);
  logger.info("Chat WebSocket ready");
  logger.info("WS hub ready");

  // Manually route HTTP upgrade requests to the correct WebSocket server
  server.on("upgrade", (req, socket, head) => {
    const pathname = new URL(req.url ?? "/", `http://${req.headers.host}`).pathname;

    if (pathname === "/ws/chat") {
      chatWss.handleUpgrade(req, socket, head, (ws) => {
        chatWss.emit("connection", ws, req);
      });
    } else if (pathname === "/ws") {
      hubWss.handleUpgrade(req, socket, head, (ws) => {
        hubWss.emit("connection", ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down…`);
    server.close(() => logger.info("HTTP server closed"));
    await epochWorker.close();
    await tradingWorker.close();
    await verificationWorker.close();
    await autoRedeemWorker.close();
    await AppDataSource.destroy();
    logger.info("Database connection closed");
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error(err, "Fatal startup error");
  process.exit(1);
});
