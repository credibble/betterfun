import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { buildApp } from "./app.js";
import { initLiveKit } from "./modules/livekit/livekit.service.js";
import { startKeeper } from "./modules/keeper/keeper.service.js";

async function main() {
  logger.info("Starting BetterFun backend...");

  const app = buildApp();
  const server = app.listen(env.PORT, env.HOST, () => {
    logger.info(`HTTP server listening on ${env.HOST}:${env.PORT}`);
    logger.info(`  env: ${env.NODE_ENV}`);
  });

  initLiveKit();

  // Start epoch keeper if configured
  if (env.KEEPER_PRIVATE_KEY && env.EPOCH_CONTROLLER_ADDRESS) {
    startKeeper({
      rpcUrl: env.SOMNIA_RPC_URL,
      keeperPrivateKey: env.KEEPER_PRIVATE_KEY as `0x${string}`,
      epochControllerAddress: env.EPOCH_CONTROLLER_ADDRESS as `0x${string}`,
      pollIntervalMs: env.KEEPER_POLL_INTERVAL_MS,
    });
  } else {
    logger.warn("Keeper not started — KEEPER_PRIVATE_KEY or EPOCH_CONTROLLER_ADDRESS missing");
  }

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down...`);
    server.close(() => logger.info("HTTP server closed"));
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error(err, "Fatal startup error");
  process.exit(1);
});