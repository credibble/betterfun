import { Router } from "express";
import { type Hex } from "viem";
import {
  readVaultState,
  readVaultShares,
  readVaultPositionTotals,
  factoryVaultCount,
} from "./vault.service.js";

export function buildVaultRoutes(factoryAddress: Hex) {
  const router = Router();

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
