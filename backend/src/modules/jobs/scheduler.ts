import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { type Hex } from "viem";
import { env } from "../../config/env.js";
import { AppDataSource } from "../../db/data-source.js";
import { EpochService } from "../epochs/epoch.service.js";
import { PotService } from "../pots/pot.service.js";
import { Pot } from "../pots/pot.entity.js";
import { SettlementService } from "../settlement/settlement.service.js";
import { AiAgentService } from "../ai/ai-agent.service.js";
import { getReadExchange } from "../dreamdex/exchange.js";
import { Position } from "../trading/position.entity.js";
import { redeemSettledPositions } from "../vault/vault-keeper.js";
import { syncPotFromVault } from "../vault/vault.service.js";
import { logger } from "../../lib/logger.js";

const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

// ── Queues ────────────────────────────────────────────────────────────────────

export const epochQueue = new Queue("epochs", { connection });
export const tradingQueue = new Queue("trading", { connection });
export const verificationQueue = new Queue("verification", { connection });
export const autoRedeemQueue = new Queue("auto-redeem", { connection });
export const vaultSyncQueue = new Queue("vault-sync", { connection });

const DEPOSIT_VERIFY_DELAY_MS = 15_000;
const DEPOSIT_VERIFY_MAX_ATTEMPTS = 20; // ~5 min of retries

/**
 * Schedule a pending deposit to be re-verified once its tUSDC transfer reaches
 * enough confirmations.
 */
export async function scheduleDepositVerification(depositId: string): Promise<void> {
  await verificationQueue.add("verify-deposit", { depositId }, { delay: DEPOSIT_VERIFY_DELAY_MS });
}

const SETTLE_RETRY_MS = 60_000;
const SETTLE_MAX_RETRIES = 60; // ~1h of retries before forced settlement

function delayToMs(target: Date): number {
  return Math.max(0, target.getTime() - Date.now());
}

/** Safely add a one-shot delayed job, removing any existing job with the same ID first. */
async function addDelayedJob(
  queue: Queue,
  name: string,
  data: Record<string, unknown>,
  opts: { delay: number; jobId: string },
): Promise<void> {
  try {
    await queue.remove(opts.jobId);
  } catch {
    // Job may not exist — that's fine
  }
  await queue.add(name, data, { delay: opts.delay, jobId: opts.jobId });
}

/**
 * Are all of an epoch's open-position markets finalized (resolved or voided)?
 * If the epoch has no open positions, this returns true.
 */
async function areEpochMarketsFinalized(epochId: string): Promise<boolean> {
  const { Pot } = await import("../pots/pot.entity.js");
  const potRepo = AppDataSource.getRepository(Pot);
  const positionRepo = AppDataSource.getRepository(Position);

  const pots = await potRepo.find({ where: { epochId } });
  const potIds = new Set(pots.map((p) => p.id));
  const positions = await positionRepo.find({ where: { status: "open" } });
  const epochPositions = positions.filter((p) => potIds.has(p.potId));
  if (epochPositions.length === 0) return true;

  const exchange = getReadExchange();
  for (const pos of epochPositions) {
    try {
      const onchain = await exchange.client.getMarketOnchain(pos.marketId as `0x${string}`);
      if (!onchain.isResolved && !onchain.isVoided) return false;
    } catch {
      return false; // chain/indexer hiccup — retry
    }
  }
  return true;
}

// ── Epoch Worker ──────────────────────────────────────────────────────────────

export function startEpochWorker() {
  const epochService = new EpochService(AppDataSource);
  const potService = new PotService(AppDataSource);
  const settlementService = new SettlementService(AppDataSource);
  const aiAgentService = new AiAgentService(AppDataSource);

  const worker = new Worker(
    "epochs",
    async (job: Job) => {
      const { epochId, action, attempt } = job.data;

      switch (action) {
        case "go_live": {
          const epoch = await epochService.getById(epochId);
          if (!epoch || epoch.status !== "upcoming") break;

          logger.info(`Epoch ${epoch.number} → live`);
          await epochService.goLive(epochId);

          const pots = await potService.list({ epochId });

          // Mark all pots as trading
          for (const pot of pots) {
            pot.status = "trading";
            await AppDataSource.getRepository(Pot).save(pot);
          }

          // Schedule AI agent cycles for each pot while the epoch is live
          for (const pot of pots) {
            await tradingQueue.add("ai-cycle", { potId: pot.id, potIndex: pot.signerIndex }, {
              repeat: { every: env.AI_CYCLE_INTERVAL_MS },
              jobId: `ai-cycle-${pot.id}`,
            });
          }

          // Schedule settling close (with buffer) and final settlement — one-shot delayed jobs
          const settleAt = new Date(epoch.endsAt.getTime() - env.SETTLEMENT_BUFFER_MIN * 60 * 1000);
          const settleDelay = delayToMs(settleAt);
          await addDelayedJob(epochQueue, `go_settling-${epochId}`, { epochId, action: "go_settling" }, { delay: settleDelay, jobId: `go_settling-${epochId}` });
          const finalSettleAt = new Date(epoch.endsAt.getTime() + 5 * 60 * 1000);
          const finalSettleDelay = delayToMs(finalSettleAt);
          await addDelayedJob(epochQueue, `settle-${epochId}`, { epochId, action: "settle" }, { delay: finalSettleDelay, jobId: `settle-${epochId}` });

          // Roll over: ensure the NEXT epoch exists as "upcoming" so traders can
          // open pots and followers can fund during this epoch's live window.
          const next = await epochService.ensureNext();
          if (next) {
            await scheduleEpoch(epochService, next);
          }

          break;
        }

        case "go_settling": {
          const epoch = await epochService.getById(epochId);
          if (!epoch || epoch.status !== "live") break;

          logger.info(`Epoch ${epoch.number} → settling`);
          await epochService.goSettling(epochId);

          // Stop AI agent cycles for this epoch's pots
          const pots = await potService.list({ epochId });
          for (const pot of pots) {
            await tradingQueue.removeRepeatableByKey(`ai-cycle-${pot.id}:${env.AI_CYCLE_INTERVAL_MS}`);
          }

          break;
        }

        case "settle": {
          const epoch = await epochService.getById(epochId);
          if (!epoch || epoch.status !== "settling") break;

          // Wait for every market to finalize before computing NAV.
          const finalized = await areEpochMarketsFinalized(epochId);
          const attemptCount = Number(attempt ?? 0);
          if (!finalized && attemptCount < SETTLE_MAX_RETRIES) {
            logger.info(`Epoch ${epoch.number}: awaiting market resolution (attempt ${attemptCount + 1})`);
            // Use a one-shot delayed job for retry, not a scheduler
            await epochQueue.add(`settle-retry-${epochId}`, { epochId, action: "settle", attempt: attemptCount + 1 }, {
              delay: SETTLE_RETRY_MS,
              jobId: `settle-retry-${epochId}-${attemptCount + 1}`,
            });
            return;
          }

          if (!finalized) {
            logger.warn(`Epoch ${epoch.number}: forcing settlement after ${SETTLE_MAX_RETRIES} attempts — some markets unresolved`);
          }

          logger.info(`Epoch ${epoch.number} → settling & payout`);
          await settlementService.settleEpoch(epochId);
          await epochService.goSettled(epochId);

          // Roll over: ensure the next epoch exists and is scheduled
          const next = await epochService.ensureNext();
          if (next) {
            await scheduleEpoch(epochService, next);
          }
          break;
        }

        case "ensure": {
          // Self-healing rollover: guarantee an upcoming epoch always exists
          // (runs every 60s via a repeatable job).
          const next = await epochService.ensureNext();
          if (next) {
            await scheduleEpoch(epochService, next);
          }
          break;
        }

        default:
          logger.warn(`Unknown epoch action: ${action}`);
      }
    },
    { connection, concurrency: 1 },
  );

  worker.on("failed", (job, err) => {
    logger.error(err, `Epoch job ${job?.id} failed`);
  });

  worker.on("completed", (job) => {
    logger.info(`Epoch job ${job.id} completed: ${job.data.action}`);
  });

  return worker;
}

// ── Trading Worker (AI Agent) ─────────────────────────────────────────────────

export function startTradingWorker() {
  const aiAgentService = new AiAgentService(AppDataSource);

  const worker = new Worker(
    "trading",
    async (job: Job) => {
      if (job.name === "ai-cycle") {
        const { potId } = job.data;
        await aiAgentService.runCycle(potId);
      }
    },
    { connection, concurrency: 1 },
  );

  worker.on("failed", (job, err) => {
    logger.error(err, `Trading job ${job?.id} failed`);
  });

  return worker;
}

/**
 * Schedule an epoch's lifecycle transitions. Uses jobId to deduplicate —
 * calling multiple times for the same epoch won't create duplicate jobs.
 * All epoch transitions use one-shot delayed jobs (add) to prevent
 * repeated firing that causes infinite epoch cycling.
 */
async function scheduleEpoch(epochService: EpochService, epoch: any): Promise<void> {
  if (epoch.status === "upcoming") {
    const delay = delayToMs(new Date(epoch.startsAt));
    if (delay <= 0) {
      logger.warn(`Epoch ${epoch.number} startsAt is in the past, transitioning to live now`);
      await epochService.goLive(epoch.id);
    } else {
      await addDelayedJob(epochQueue, `go_live-${epoch.id}`, { epochId: epoch.id, action: "go_live" }, { delay, jobId: `go_live-${epoch.id}` });
      logger.info(`Scheduled go_live for epoch ${epoch.number} in ${Math.round(delay / 1000)}s`);
    }
  }

  if (epoch.status === "live" || epoch.status === "upcoming") {
    const settleAt = new Date(epoch.endsAt.getTime() - env.SETTLEMENT_BUFFER_MIN * 60 * 1000);
    const settleDelay = delayToMs(settleAt);
    await addDelayedJob(epochQueue, `go_settling-${epoch.id}`, { epochId: epoch.id, action: "go_settling" }, { delay: settleDelay, jobId: `go_settling-${epoch.id}` });
    const finalSettleAt = new Date(epoch.endsAt.getTime() + 5 * 60 * 1000);
    const finalSettleDelay = delayToMs(finalSettleAt);
    await addDelayedJob(epochQueue, `settle-${epoch.id}`, { epochId: epoch.id, action: "settle" }, { delay: finalSettleDelay, jobId: `settle-${epoch.id}` });
    logger.info(`Scheduled go_settling + settle for epoch ${epoch.number}`);
  }
}

// ── Deposit Verification Worker ────────────────────────────────────────────────

export function startVerificationWorker() {
  const potService = new PotService(AppDataSource);

  const worker = new Worker(
    "verification",
    async (job: Job) => {
      if (job.name !== "verify-deposit") return;
      const { depositId, attempt } = job.data;
      const share = await potService.confirmPendingDeposit(depositId);

      if (!share) {
        // Deposit may still be pending confirmation (or failed). Retry until cap.
        const attemptCount = Number(attempt ?? 0);
        if (attemptCount < DEPOSIT_VERIFY_MAX_ATTEMPTS) {
          await verificationQueue.add("verify-deposit", { depositId, attempt: attemptCount + 1 }, {
            delay: DEPOSIT_VERIFY_DELAY_MS,
          });
        } else {
          logger.warn(`Deposit ${depositId} verification abandoned after ${DEPOSIT_VERIFY_MAX_ATTEMPTS} attempts`);
        }
      }
    },
    { connection, concurrency: 2 },
  );

  worker.on("failed", (job, err) => {
    logger.error(err, `Verification job ${job?.id} failed`);
  });

  return worker;
}

// ── Auto-Redeem Worker ────────────────────────────────────────────────────────

const AUTO_REDEEM_INTERVAL_MS = 60_000;

export function startAutoRedeemWorker() {
  const settlementService = new SettlementService(AppDataSource);

  const worker = new Worker(
    "auto-redeem",
    async (job: Job) => {
      if (job.name !== "check-and-redeem") return;

      const potsRedeemed = await settlementService.redeemExpiredPositions();
      if (potsRedeemed > 0) {
        logger.info(`Auto-redeem cycle: redeemed positions in ${potsRedeemed} pot(s)`);
      }

      // Also run the vault settlement keeper for each pot with a deployed vault.
      const potRepo = AppDataSource.getRepository(Pot);
      const pots = await potRepo.find({ where: { status: "trading" } });
      const operatorKey = env.POT_MASTER_SEED as Hex | undefined;

      if (operatorKey) {
        for (const pot of pots) {
          const vaultAddr = pot.vaultAddress as Hex | undefined;
          if (vaultAddr && vaultAddr !== "0x0000000000000000000000000000000000000000") {
            try {
              await redeemSettledPositions(vaultAddr, operatorKey);
            } catch (err) {
              logger.warn(err, `Vault keeper failed for pot ${pot.id}`);
            }
          }
        }
      }
    },
    { connection, concurrency: 1 },
  );

  worker.on("failed", (job, err) => {
    logger.error(err, `Auto-redeem job ${job?.id} failed`);
  });

  return worker;
}

// ── Vault Sync Worker ──────────────────────────────────────────────────────────

const VAULT_SYNC_INTERVAL_MS = 30_000;

export function startVaultSyncWorker() {
  const worker = new Worker(
    "vault-sync",
    async (job: Job) => {
      const potRepo = AppDataSource.getRepository(Pot);
      const pots = await potRepo.find({ where: { status: "trading" } });

      for (const pot of pots) {
        const vaultAddr = pot.vaultAddress as Hex | undefined;
        if (!vaultAddr || vaultAddr === "0x0000000000000000000000000000000000000000") continue;
        try {
          await syncPotFromVault(vaultAddr, pot.id, AppDataSource);
        } catch (err) {
          logger.warn(err, `Vault sync failed for pot ${pot.id}`);
        }
      }
    },
    { connection, concurrency: 1 },
  );

  worker.on("failed", (job, err) => {
    logger.error(err, `Vault sync job ${job?.id} failed`);
  });

  return worker;
}

/**
 * Bootstrap the epoch schedule on startup: create an upcoming epoch if needed
 * and (re)schedule transitions for any epoch that isn't yet settled.
 */
export async function ensureEpochSchedule(): Promise<void> {
  const epochService = new EpochService(AppDataSource);

  const latest = await epochService.getLatest();
  // Invariant: there must ALWAYS be exactly one upcoming (funding-open) epoch so
  // traders can create pots and followers can fund ahead of the next window.
  // If the latest epoch isn't upcoming (or none exists), create the next one.
  if (!latest || latest.status !== "upcoming") {
    await epochService.ensureNext();
  }

  const epochs = await epochService.list();
  const active = epochs.filter((e) => e.status !== "settled");
  for (const epoch of active) {
    await scheduleEpoch(epochService, epoch);
  }

  // Register the recurring rollover-ensure job (idempotent by jobId).
  await epochQueue.upsertJobScheduler(
    "ensure-epoch-schedule",
    { every: 60_000 },
    { data: { action: "ensure" } },
  );

  // Register the recurring auto-redeem job (checks every 60s for finalized markets).
  await autoRedeemQueue.add("check-and-redeem", {}, {
    repeat: { every: AUTO_REDEEM_INTERVAL_MS },
    jobId: "auto-redeem-positions",
    removeOnComplete: true,
  });

  // Register the recurring vault sync job (syncs pot DB fields from on-chain vault state every 30s).
  await vaultSyncQueue.add("sync-all-pots", {}, {
    repeat: { every: 30_000 },
    jobId: "vault-sync-pots",
    removeOnComplete: true,
  });

  logger.info(`Epoch schedule ensured (${active.length} active epoch(s))`);
}