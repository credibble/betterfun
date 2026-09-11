import { env } from "./config/env.js";
import { AppDataSource } from "./db/data-source.js";
import { logger } from "./lib/logger.js";
import { buildApp } from "./app.js";
import { initLiveKit } from "./modules/livekit/livekit.service.js";
import { setupChatWs } from "./modules/livekit/chat-ws.js";
import { setupWsHub } from "./modules/realtime/ws-hub.js";

async function main() {
  logger.info("Starting BetterFun backend...");

  await AppDataSource.initialize();
  logger.info("Database connected");

  const app = buildApp(AppDataSource);
  const server = app.listen(env.PORT, env.HOST, () => {
    logger.info(`HTTP server listening on ${env.HOST}:${env.PORT}`);
    logger.info(`  env: ${env.NODE_ENV}`);
    logger.info(`  database: ${env.DATABASE_URL.replace(/:[^@]+@/, ":***@")}`);
  });

  initLiveKit();

  const chatWss = setupChatWs(server);
  const hubWss = setupWsHub(server);
  logger.info("Chat WebSocket ready");
  logger.info("WS hub ready");

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

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down...`);
    server.close(() => logger.info("HTTP server closed"));
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
