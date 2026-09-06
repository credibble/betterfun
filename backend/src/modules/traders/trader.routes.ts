import { Router } from "express";
import type { DataSource } from "typeorm";
import { TraderProfile } from "./trader-profile.entity.js";
import { requireAuth, requireTrader, type AuthenticatedRequest } from "../auth/auth.middleware.js";
import { signAccessToken } from "../auth/jwt.js";
import { TraderApplyRequest, TraderProfileUpdateRequest } from "@betterfun/shared";
import { logger } from "../../lib/logger.js";

function serializeTrader(t: TraderProfile) {
  return {
    id: t.id,
    userId: t.userId,
    traderType: t.traderType,
    aiConfig: t.aiConfig ?? undefined,
    name: t.name,
    handle: t.handle,
    bio: t.bio,
    country: t.country,
    tags: t.tags ?? [],
    verified: t.verified,
    reputation: Number(t.reputation),
    pnl30: Number(t.pnl30),
    winRate: Number(t.winRate),
    followers: Number(t.followers),
    aum: Number(t.aum),
    isLive: t.isLive,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export function buildTraderRoutes(dataSource: DataSource) {
  const router = Router();
  const repo = dataSource.getRepository(TraderProfile);

  // GET /traders/me — the caller's own profile (must come before /:id)
  router.get("/me", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const trader = await repo.findOne({ where: { userId: req.claims!.sub } });
      if (!trader) {
        res.status(404).json({ error: "No trader profile yet" });
        return;
      }
      res.json(serializeTrader(trader));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  // PATCH /traders/me — update the caller's own profile
  router.patch("/me", requireAuth, requireTrader, async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = TraderProfileUpdateRequest.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
        return;
      }

      const trader = await repo.findOne({ where: { userId: req.claims!.sub } });
      if (!trader) {
        res.status(404).json({ error: "No trader profile yet" });
        return;
      }

      if (parsed.data.name != null) trader.name = parsed.data.name;
      if (parsed.data.bio != null) trader.bio = parsed.data.bio;
      if (parsed.data.country != null) trader.country = parsed.data.country;
      if (parsed.data.tags != null) trader.tags = parsed.data.tags;

      const saved = await repo.save(trader);
      res.json(serializeTrader(saved));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  // PATCH /traders/me/live — set the caller's live-stream status
  router.patch("/me/live", requireAuth, requireTrader, async (req: AuthenticatedRequest, res) => {
    try {
      const isLive = req.body?.isLive;
      if (typeof isLive !== "boolean") {
        res.status(400).json({ error: "isLive boolean required" });
        return;
      }

      const trader = await repo.findOne({ where: { userId: req.claims!.sub } });
      if (!trader) {
        res.status(404).json({ error: "No trader profile yet" });
        return;
      }

      trader.isLive = isLive;
      const saved = await repo.save(trader);
      res.json(serializeTrader(saved));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  // POST /traders — create a trader profile (re-issues JWT with trader role)
  router.post("/", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = TraderApplyRequest.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
        return;
      }

      const existing = await repo.findOne({ where: { userId: req.claims!.sub } });
      if (existing) {
        res.status(409).json({ error: "Trader profile already exists" });
        return;
      }

      const handleTaken = await repo.findOne({ where: { handle: parsed.data.handle } });
      if (handleTaken) {
        res.status(409).json({ error: "Handle already taken" });
        return;
      }

      const trader = repo.create({
        userId: req.claims!.sub,
        traderType: parsed.data.traderType,
        name: parsed.data.name,
        handle: parsed.data.handle,
        bio: parsed.data.bio ?? parsed.data.strategy ?? "",
        country: parsed.data.country ?? "",
        tags: parsed.data.tags ?? [],
        aiConfig: parsed.data.aiConfig,
        verified: false,
        reputation: 50,
        pnl30: 0,
        winRate: 0,
        followers: 0,
        aum: 0,
        isLive: false,
      });

      const saved = await repo.save(trader);

      // Re-issue tokens with the trader role + traderId so trader-gated
      // endpoints (studio trade, create pot) unlock immediately.
      const accessToken = signAccessToken({
        sub: req.claims!.sub,
        address: req.claims!.address,
        role: "trader",
        traderId: saved.id,
      });

      logger.info(`Trader profile created: ${saved.handle} (${saved.traderType})`);
      res.status(201).json({
        trader: serializeTrader(saved),
        accessToken,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  // GET /traders — list all traders
  router.get("/", async (_req, res) => {
    try {
      const traders = await repo.find({ order: { reputation: "DESC" } });
      res.json(traders.map(serializeTrader));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  // GET /traders/:id — single trader (must come after /me and /)
  router.get("/:id", async (req, res) => {
    const trader = await repo.findOne({ where: { id: req.params.id } });
    if (!trader) {
      res.status(404).json({ error: "Trader not found" });
      return;
    }
    res.json(serializeTrader(trader));
  });

  return router;
}