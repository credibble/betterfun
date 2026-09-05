import { Router } from "express";
import type { DataSource } from "typeorm";
import {
  loadLiveBinaryMarkets,
  fetchOrderBook,
  fetchCandles,
  fetchPrice,
} from "../dreamdex/market.service.js";

export function buildMarketRoutes(_dataSource: DataSource) {
  const router = Router();

  // GET /markets — all live BTC/ETH binary markets
  router.get("/", async (_req, res) => {
    try {
      const markets = await loadLiveBinaryMarkets();
      res.json(markets);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  // GET /markets/price/:asset — live price from on-chain oracle
  router.get("/price/:asset", async (req, res) => {
    try {
      const asset = req.params.asset.toUpperCase();
      if (asset !== "BTC" && asset !== "ETH") {
        res.status(400).json({ error: "Asset must be BTC or ETH" });
        return;
      }
      const price = await fetchPrice(asset as "BTC" | "ETH");
      res.json({ asset, price });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  // GET /markets/:symbol/book — order book (must come before /:id)
  router.get("/:symbol/book", async (req, res) => {
    try {
      const { symbol } = req.params;
      const depth = Number(req.query.depth) || 5;
      const book = await fetchOrderBook(symbol, depth);
      res.json(book);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  // GET /markets/:symbol/candles — candles (must come before /:id)
  router.get("/:symbol/candles", async (req, res) => {
    try {
      const { symbol } = req.params;
      const interval = Number(req.query.interval) || 60;
      const limit = Number(req.query.limit) || 100;
      const candles = await fetchCandles(symbol, interval, limit);
      res.json(candles);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  // GET /markets/:id — single market by ID (catch-all last)
  router.get("/:id", async (req, res) => {
    try {
      const markets = await loadLiveBinaryMarkets();
      const market = markets.find(
        (m) => m.id.toLowerCase() === req.params.id.toLowerCase(),
      );
      if (!market) {
        res.status(404).json({ error: "Market not found" });
        return;
      }
      res.json(market);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  return router;
}
