import { Router } from "express";
import type { DataSource } from "typeorm";
import { PotService } from "./pot.service.js";
import { verifyTusdcTransfer, isPendingResult } from "../dreamdex/verify.js";
import { scheduleDepositVerification } from "../jobs/scheduler.js";
import { env } from "../../config/env.js";
import { requireAuth, requireTrader, type AuthenticatedRequest } from "../auth/auth.middleware.js";
import { CreatePotRequest, DepositRequest, WithdrawRequest } from "@betterfun/shared";
import { readVaultNav, readVaultShares, publicClient, EVENT_VAULT_ABI } from "../vault/vault.service.js";
import { type Hex, decodeEventLog, formatUnits } from "viem";

export function buildPotRoutes(dataSource: DataSource) {
  const router = Router();
  const service = new PotService(dataSource);

  // GET /pots — list all pots (optionally filter by epoch or trader)
  router.get("/", async (req, res) => {
    try {
      const epochId = typeof req.query.epochId === "string" ? req.query.epochId : undefined;
      const traderId = typeof req.query.traderId === "string" ? req.query.traderId : undefined;
      const pots = await service.list({ epochId, traderId });
      res.json(pots.map(serializePot));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  // GET /pots/:id — get pot by ID
  router.get("/:id", async (req, res) => {
    try {
      const pot = await service.getById(req.params.id);
      if (!pot) {
        res.status(404).json({ error: "Pot not found" });
        return;
      }
      res.json(serializePot(pot));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  // POST /pots — create a new pot (trader only)
  router.post("/", requireAuth, requireTrader, async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = CreatePotRequest.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
        return;
      }

      if (!req.claims?.traderId) {
        res.status(400).json({ error: "No trader profile linked" });
        return;
      }

      const pot = await service.create({
        traderId: req.claims.traderId,
        epochId: parsed.data.epochId,
        strategy: parsed.data.strategy,
      });

      res.status(201).json(serializePot(pot));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(400).json({ error: message });
    }
  });

  // POST /pots/:id/deposit — deposit tUSDC into a pot
  router.post("/:id/deposit", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = DepositRequest.safeParse({ ...req.body, potId: req.params.id });
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
        return;
      }

      // In production, this is called after the backend detects a confirmed
      // tUSDC Transfer event from the user's wallet to the pot signer address.
      const txHash = req.body.txHash;
      if (!txHash || typeof txHash !== "string") {
        res.status(400).json({ error: "txHash required" });
        return;
      }

      const pot = await service.getById(req.params.id as string);
      if (!pot) {
        res.status(404).json({ error: "Pot not found" });
        return;
      }

      // Verify on-chain: a confirmed tUSDC transfer from the user's wallet to
      // the pot signer, for (approximately) the requested amount.
      const verified = await verifyTusdcTransfer({
        txHash: txHash as `0x${string}`,
        fromAddress: req.claims!.address as `0x${string}`,
        toAddress: pot.signerAddress as `0x${string}`,
        amountUsd: parsed.data.amountUsd,
        confirmations: env.DEPOSIT_CONFIRM_BLOCKS,
      });

      if (isPendingResult(verified)) {
        // Tx seen but not yet confirmed — record pending + verify via worker.
        const deposit = await service.recordPendingDeposit({
          potId: req.params.id as string,
          userId: req.claims!.sub,
          amountUsd: parsed.data.amountUsd,
          txHash,
        });
        scheduleDepositVerification(deposit.id);
        res.status(202).json({ status: "pending", depositId: deposit.id });
        return;
      }

      if (!verified.ok) {
        res.status(400).json({ error: `Deposit not verified: ${verified.reason ?? "unknown"}` });
        return;
      }

      const share = await service.creditDeposit({
        potId: req.params.id as string,
        userId: req.claims!.sub,
        amountUsd: parsed.data.amountUsd,
        txHash,
      });

      res.json({
        shares: Number(share.shares),
        investedUsd: Number(share.investedUsd),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(400).json({ error: message });
    }
  });

  // POST /pots/:id/withdraw — withdraw before epoch starts
  router.post("/:id/withdraw", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = WithdrawRequest.safeParse({ ...req.body, potId: req.params.id });
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
        return;
      }

      const withdrawal = await service.withdraw({
        potId: req.params.id as string,
        userId: req.claims!.sub,
        userAddress: req.claims!.address,
        amountUsd: parsed.data.amountUsd,
      });

      res.json({
        id: withdrawal.id,
        amountUsd: Number(withdrawal.amountUsd),
        status: withdrawal.status,
        txHash: withdrawal.txHash,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(400).json({ error: message });
    }
  });

  // POST /pots/:id/sync-vault-deposit — record an on-chain vault.enter() deposit in the DB
  router.post("/:id/sync-vault-deposit", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { txHash } = req.body;
      if (!txHash || typeof txHash !== "string") {
        res.status(400).json({ error: "txHash required" });
        return;
      }

      const pot = await service.getById(req.params.id as string);
      if (!pot) {
        res.status(404).json({ error: "Pot not found" });
        return;
      }

      const vaultAddr = pot.vaultAddress as Hex | undefined;
      if (!vaultAddr || vaultAddr === "0x0000000000000000000000000000000000000000") {
        res.status(400).json({ error: "Vault not deployed for this pot" });
        return;
      }

      // Fetch the tx receipt and parse the Deposit event
      const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
      if (!receipt) {
        res.status(404).json({ error: "Transaction not found" });
        return;
      }

      let depositAmount = 0;
      let sharesMinted = 0;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: EVENT_VAULT_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "Deposit" && decoded.args.lp.toLowerCase() === req.claims!.address.toLowerCase()) {
            depositAmount = Number(formatUnits(decoded.args.collateralIn, 6));
            sharesMinted = Number(formatUnits(decoded.args.sharesOut, 18));
            break;
          }
        } catch {
          // Not our event, skip
        }
      }

      if (depositAmount <= 0) {
        res.status(400).json({ error: "No valid vault deposit found for this user in the transaction" });
        return;
      }

      const result = await service.syncVaultDeposit({
        potId: req.params.id as string,
        userId: req.claims!.sub,
        amountUsd: depositAmount,
        shares: sharesMinted,
        txHash,
      });

      res.json({
        shares: Number(result.shares),
        investedUsd: Number(result.investedUsd),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(400).json({ error: message });
    }
  });

  // GET /pots/:id/shares — get shares for a pot
  router.get("/:id/shares", async (req, res) => {
    try {
      const shares = await service.getShares(req.params.id);
      res.json(shares.map((s) => ({
        id: s.id,
        userId: s.userId,
        shares: Number(s.shares),
        investedUsd: Number(s.investedUsd),
        claimableUsd: Number(s.claimableUsd),
      })));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  return router;
}

function serializePot(pot: any) {
  return {
    id: pot.id,
    traderId: pot.traderId,
    epochId: pot.epochId,
    strategy: pot.strategy,
    status: pot.status,
    cash: Number(pot.cash),
    nav: Number(pot.nav),
    deployed: Number(pot.deployed),
    lpPrice: Number(pot.lpPrice),
    sharesOutstanding: Number(pot.sharesOutstanding),
    signerAddress: pot.signerAddress,
    vaultAddress: pot.vaultAddress ?? null,
    createdAt: pot.createdAt?.toISOString?.() ?? pot.createdAt,
    updatedAt: pot.updatedAt?.toISOString?.() ?? pot.updatedAt,
  };
}
