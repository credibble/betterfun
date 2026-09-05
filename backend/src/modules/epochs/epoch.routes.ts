import { Router } from "express";
import type { DataSource } from "typeorm";
import { EpochService } from "./epoch.service.js";
import { requireAuth } from "../auth/auth.middleware.js";

export function buildEpochRoutes(dataSource: DataSource) {
  const router = Router();
  const service = new EpochService(dataSource);

  // GET /epochs — list all epochs
  router.get("/", async (_req, res) => {
    try {
      const epochs = await service.list();
      res.json(epochs.map((e) => ({
        id: e.id,
        number: e.number,
        startsAt: e.startsAt.toISOString(),
        endsAt: e.endsAt.toISOString(),
        status: e.status,
        potCount: e.potCount,
        tvl: Number(e.tvl),
        createdAt: e.createdAt.toISOString(),
      })));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  // GET /epochs/:id — get epoch by ID
  router.get("/:id", async (req, res) => {
    try {
      const epoch = await service.getById(req.params.id);
      if (!epoch) {
        res.status(404).json({ error: "Epoch not found" });
        return;
      }
      res.json({
        id: epoch.id,
        number: epoch.number,
        startsAt: epoch.startsAt.toISOString(),
        endsAt: epoch.endsAt.toISOString(),
        status: epoch.status,
        potCount: epoch.potCount,
        tvl: Number(epoch.tvl),
        createdAt: epoch.createdAt.toISOString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  // GET /epochs/active — get the live epoch
  router.get("/active", async (_req, res) => {
    try {
      const epoch = await service.getActive();
      if (!epoch) {
        res.status(404).json({ error: "No active epoch" });
        return;
      }
      res.json({
        id: epoch.id,
        number: epoch.number,
        startsAt: epoch.startsAt.toISOString(),
        endsAt: epoch.endsAt.toISOString(),
        status: epoch.status,
        potCount: epoch.potCount,
        tvl: Number(epoch.tvl),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  // POST /epochs — create a new epoch (admin only)
  router.post("/", requireAuth, async (req, res) => {
    try {
      const { number, startsAt, endsAt } = req.body;
      if (!number || !startsAt || !endsAt) {
        res.status(400).json({ error: "number, startsAt, endsAt required" });
        return;
      }
      const epoch = await service.create({
        number: Number(number),
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
      });
      res.status(201).json({
        id: epoch.id,
        number: epoch.number,
        startsAt: epoch.startsAt.toISOString(),
        endsAt: epoch.endsAt.toISOString(),
        status: epoch.status,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  return router;
}
