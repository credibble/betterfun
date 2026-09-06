import { Router } from "express";
import type { DataSource } from "typeorm";
import { SettlementService } from "./settlement.service.js";
import { requireAuth, type AuthenticatedRequest } from "../auth/auth.middleware.js";
import { User } from "../auth/user.entity.js";

export function buildSettlementRoutes(dataSource: DataSource) {
  const router = Router();
  const service = new SettlementService(dataSource);
  const userRepo = dataSource.getRepository(User);

  // POST /settlement/epoch/:epochId/settle — trigger epoch settlement (admin)
  // Route defined FIRST to avoid /:potId catching "epoch" as a potId.
  router.post("/epoch/:epochId/settle", requireAuth, async (req, res) => {
    try {
      await service.settleEpoch(req.params.epochId as string);
      res.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  // GET /settlement/:potId — get payout for a pot
  router.get("/:potId", async (req, res) => {
    try {
      const payout = await service.getPayout(req.params.potId as string);
      if (!payout) {
        res.status(404).json({ error: "No payout found" });
        return;
      }
      res.json({
        id: payout.id,
        potId: payout.potId,
        epochId: payout.epochId,
        perShare: Number(payout.perShare),
        traderCutUsd: Number(payout.traderCutUsd),
        protocolCutUsd: Number(payout.protocolCutUsd),
        lpDistributedUsd: Number(payout.lpDistributedUsd),
        distribution: payout.distribution,
        status: payout.status,
        createdAt: payout.createdAt.toISOString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  // POST /settlement/:potId/claim — claim payout (user only)
  router.post("/:potId/claim", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.claims!.sub;
      const { userAddress } = req.body;

      if (!userAddress || typeof userAddress !== "string") {
        res.status(400).json({ error: "userAddress required" });
        return;
      }

      // Validate userAddress matches the authenticated user's wallet
      const user = await userRepo.findOne({ where: { id: userId } });
      if (!user) {
        res.status(401).json({ error: "User not found" });
        return;
      }

      const claimedAddress = (userAddress as string).toLowerCase();
      const walletAddress = user.walletAddress?.toLowerCase();
      if (!walletAddress || claimedAddress !== walletAddress) {
        res.status(403).json({ error: "userAddress does not match your wallet" });
        return;
      }

      const result = await service.claimPayout({
        potId: req.params.potId as string,
        userId,
        userAddress,
      });
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(400).json({ error: message });
    }
  });

  return router;
}
