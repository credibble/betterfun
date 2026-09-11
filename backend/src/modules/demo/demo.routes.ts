import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import { logger } from "../../lib/logger.js";

const router = Router();

// POST /demo/seed — seed demo data (epochs, traders, pots)
router.post("/seed", requireAuth, async (_req, res) => {
  try {
    logger.info("Demo seed requested");
    // Placeholder — full demo seeding needs contract interaction
    res.json({ ok: true, epoch: null, message: "Demo seed not yet implemented" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    res.status(500).json({ error: message });
  }
});

// POST /demo/fast-forward/:epochId — advance an epoch through its lifecycle
router.post("/fast-forward/:epochId", requireAuth, async (req, res) => {
  try {
    const { epochId } = req.params;
    logger.info(`Demo fast-forward requested for epoch ${epochId}`);
    // Placeholder — full fast-forward needs EpochController contract calls
    res.json({ ok: true, action: "fast-forward", status: "not_implemented" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    res.status(500).json({ error: message });
  }
});

export function buildDemoRoutes() {
  return router;
}
