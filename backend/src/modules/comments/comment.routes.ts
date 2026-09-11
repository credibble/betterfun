import { Router } from "express";
import { type DataSource } from "typeorm";
import { Comment } from "./comment.entity.js";
import { requireAuth, type AuthenticatedRequest } from "../auth/auth.middleware.js";

export function buildCommentRoutes(dataSource: DataSource) {
  const router = Router();
  const repo = dataSource.getRepository(Comment);

  // GET /comments/:marketId — list comments for a market
  router.get("/:marketId", async (req, res) => {
    try {
      const marketId = req.params.marketId as string;
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const comments = await repo.find({
        where: { marketId },
        order: { createdAt: "DESC" },
        take: limit,
      });
      res.json(comments);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  // POST /comments/:marketId — post a comment
  router.post("/:marketId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const marketId = req.params.marketId as string;
      const { text } = req.body;
      if (!text || typeof text !== "string" || text.trim().length === 0) {
        res.status(400).json({ error: "text required" });
        return;
      }

      const comment = repo.create({
        marketId,
        userId: req.claims!.sub,
        authorName: req.claims!.address?.slice(0, 10) ?? "anon",
        text: text.trim().slice(0, 1000),
      });

      const saved = await repo.save(comment);
      res.json(saved);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  // POST /comments/:id/like — like a comment
  router.post("/:id/like", requireAuth, async (req, res) => {
    try {
      const id = req.params.id as string;
      await repo.increment({ id }, "likes", 1);
      res.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  return router;
}
