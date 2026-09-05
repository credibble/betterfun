import { Router } from "express";
import type { DataSource } from "typeorm";
import { EpochService } from "../epochs/epoch.service.js";
import { PotService } from "../pots/pot.service.js";
import { SettlementService } from "../settlement/settlement.service.js";
import { epochQueue } from "../jobs/scheduler.js";
import { logger } from "../../lib/logger.js";

export function buildDemoRoutes(dataSource: DataSource) {
  const router = Router();
  const epochService = new EpochService(dataSource);
  const potService = new PotService(dataSource);
  const settlementService = new SettlementService(dataSource);

  // POST /demo/fast-forward/:epochId — advance epoch to next state
  router.post("/fast-forward/:epochId", async (req, res) => {
    try {
      const epochId = req.params.epochId as string;
      const epoch = await epochService.getById(epochId);
      if (!epoch) {
        res.status(404).json({ error: "Epoch not found" });
        return;
      }

      let action: string;
      switch (epoch.status) {
        case "upcoming":
          action = "go_live";
          await epochService.goLive(epochId);
          break;
        case "live":
          action = "go_settling";
          await epochService.goSettling(epochId);
          break;
        case "settling":
          action = "settle";
          await settlementService.settleEpoch(epochId);
          break;
        default:
          res.status(400).json({ error: `Epoch already in ${epoch.status}` });
          return;
      }

      logger.info(`Demo: epoch ${epoch.number} fast-forwarded to ${action}`);
      res.json({ ok: true, action, status: (await epochService.getById(epochId))?.status });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  // POST /demo/seed — create a demo epoch with pots
  router.post("/seed", async (req, res) => {
    try {
      // Create an epoch starting now, ending in 10 minutes
      const now = new Date();
      const epoch = await epochService.create({
        number: Math.floor(Date.now() / 60000),
        startsAt: now,
        endsAt: new Date(now.getTime() + 10 * 60 * 1000),
      });

      logger.info(`Demo: seeded epoch ${epoch.number}`);
      res.json({ ok: true, epoch });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  return router;
}
