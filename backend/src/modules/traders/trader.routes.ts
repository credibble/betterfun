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
    avatarUrl: t.avatarUrl ?? "",
    bio: t.bio,
    country: t.country,
    tags: t.tags ?? [],
    isLive: t.isLive,
    videoUrl: t.videoUrl ?? undefined,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export function buildTraderRoutes(dataSource: DataSource) {
  const router = Router();
  const repo = dataSource.getRepository(TraderProfile);

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

  router.patch("/me", requireAuth, async (req: AuthenticatedRequest, res) => {
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
      if (parsed.data.avatarUrl != null) trader.avatarUrl = parsed.data.avatarUrl;
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

  router.patch("/me/video", requireAuth, requireTrader, async (req: AuthenticatedRequest, res) => {
    try {
      const { videoUrl } = req.body ?? {};
      if (typeof videoUrl !== "string") {
        res.status(400).json({ error: "videoUrl string required" });
        return;
      }

      const trader = await repo.findOne({ where: { userId: req.claims!.sub } });
      if (!trader) {
        res.status(404).json({ error: "No trader profile yet" });
        return;
      }

      trader.videoUrl = videoUrl || undefined;
      const saved = await repo.save(trader);
      res.json(serializeTrader(saved));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

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
        isLive: false,
      });

      const saved = await repo.save(trader);

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

  router.get("/", async (_req, res) => {
    try {
      const traders = await repo.find({ order: { createdAt: "DESC" } });
      res.json(traders.map(serializeTrader));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  router.get("/live", async (_req, res) => {
    try {
      const traders = await repo.find({ where: { isLive: true }, order: { createdAt: "DESC" } });
      res.json(traders.map(serializeTrader));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  router.get("/top", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const traders = await repo.find({ order: { createdAt: "DESC" }, take: limit });
      res.json(traders.map(serializeTrader));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  router.get("/:id", async (req, res) => {
    const trader = await repo.findOne({ where: { id: req.params.id } });
    if (!trader) {
      res.status(404).json({ error: "Trader not found" });
      return;
    }
    res.json(serializeTrader(trader));
  });

  // ── Follow / Unfollow (off-chain social) ────────────────────────────────────

  // GET /traders/:id/following — is the current user following this trader?
  router.get("/:id/following", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const traderId = req.params.id;
      const follower = await repo
        .createQueryBuilder("t")
        .innerJoin("t.user", "u")
        .where("t.id = :traderId", { traderId })
        .getOne();
      if (!follower) {
        res.status(404).json({ error: "Trader not found" });
        return;
      }
      // For now, return false — full follow system needs a Follow entity
      res.json({ following: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  // POST /traders/:id/follow — follow a trader
  router.post("/:id/follow", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const traderId = req.params.id as string;
      const trader = await repo.findOne({ where: { id: traderId } });
      if (!trader) {
        res.status(404).json({ error: "Trader not found" });
        return;
      }
      // Placeholder — full follow system needs a Follow entity
      res.json({ following: true, followers: 0 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  // DELETE /traders/:id/follow — unfollow a trader
  router.delete("/:id/follow", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const traderId = req.params.id as string;
      const trader = await repo.findOne({ where: { id: traderId } });
      if (!trader) {
        res.status(404).json({ error: "Trader not found" });
        return;
      }
      // Placeholder — full follow system needs a Follow entity
      res.json({ following: false, followers: 0 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  return router;
}
