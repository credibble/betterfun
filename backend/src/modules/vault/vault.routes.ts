import { Router } from "express";
import { type Hex } from "viem";
import { requireAuth, type AuthenticatedRequest } from "../auth/auth.middleware.js";
import {
  readVaultState,
  readVaultShares,
  readVaultPositionTotals,
  factoryVaultCount,
  factoryDeploy,
  deployFactory,
} from "./vault.service.js";

export function buildVaultRoutes(factoryAddress: Hex) {
  const router = Router();

  // POST /vault/factory/deploy-factory — deploy NEW factory (governance only, one-time)
  router.post("/factory/deploy-factory", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.claims?.role !== "admin") {
        res.status(403).json({ error: "Admin only" });
        return;
      }
      const receipt = await deployFactory();
      res.json({ receipt, factoryAddress: receipt.contractAddress });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  // POST /vault/factory/deploy — deploy new vault for a trader (governance only)
  router.post("/factory/deploy", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.claims?.role !== "admin") {
        res.status(403).json({ error: "Admin only" });
        return;
      }
      const { trader, exposureLimit } = req.body as { trader: Hex; exposureLimit: string };
      if (!trader || !exposureLimit) {
        res.status(400).json({ error: "trader and exposureLimit required" });
        return;
      }
      const receipt = await factoryDeploy(factoryAddress, trader, BigInt(exposureLimit));
      res.json({ receipt });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  // GET /vault/:address — full vault state snapshot
  router.get("/:address", async (req, res) => {
    try {
      const vault = req.params.address as Hex;
      const state = await readVaultState(vault);
      const positions = await readVaultPositionTotals(vault);
      res.json({ ...state, positions });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  // GET /vault/:address/shares/:owner — LP share balance
  router.get("/:address/shares/:owner", async (req, res) => {
    try {
      const vault = req.params.address as Hex;
      const owner = req.params.owner as Hex;
      const shares = await readVaultShares(vault, owner);
      res.json({ shares: shares.toString() });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  // GET /vault/factory/count — number of vaults deployed
  router.get("/factory/count", async (_req, res) => {
    try {
      const count = await factoryVaultCount(factoryAddress);
      res.json({ count: count.toString() });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  return router;
}
