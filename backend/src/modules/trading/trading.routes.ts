import { Router } from "express";
import type { DataSource } from "typeorm";
import { TradingService } from "./trading.service.js";
import { requireAuth, requireTrader, type AuthenticatedRequest } from "../auth/auth.middleware.js";
import { TradeRequest } from "@betterfun/shared";

export function buildTradingRoutes(dataSource: DataSource) {
  const router = Router();
  const service = new TradingService(dataSource);

  // POST /studio/trade — execute a trade (trader only)
  router.post("/trade", requireAuth, requireTrader, async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = TradeRequest.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
        return;
      }

      const { orderId, filled, price } = await service.executeTrade({
        potId: parsed.data.potId,
        marketId: parsed.data.marketId,
        side: parsed.data.side,
        sizeUsd: parsed.data.sizeUsd,
        maxPrice: parsed.data.maxPrice,
        orderType: parsed.data.orderType,
        expiresInSec: parsed.data.expiresInSec,
      });

      res.json({ orderId, filled, price });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(400).json({ error: message });
    }
  });

  // POST /studio/cancel — cancel a resting order (trader only)
  router.post("/cancel", requireAuth, requireTrader, async (req: AuthenticatedRequest, res) => {
    try {
      const potId = typeof req.body?.potId === "string" ? req.body.potId : "";
      const orderId = typeof req.body?.orderId === "string" ? req.body.orderId : "";
      if (!potId || !orderId) {
        res.status(400).json({ error: "potId and orderId required" });
        return;
      }
      const result = await service.cancelOrder({ potId, orderId });
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(400).json({ error: message });
    }
  });

  // GET /studio/positions — get open positions for a pot
  router.get("/positions", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const potId = typeof req.query.potId === "string" ? req.query.potId : "";
      if (!potId) {
        res.status(400).json({ error: "potId query param required" });
        return;
      }
      const positions = await service.getPositions(potId);
      res.json(positions.map((p) => ({
        id: p.id,
        potId: p.potId,
        marketId: p.marketId,
        symbol: p.symbol,
        side: p.side,
        contracts: Number(p.contracts),
        avgPrice: Number(p.avgPrice),
        status: p.status,
        realizedPnl: Number(p.realizedPnl),
        win: p.win,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  // GET /studio/trades — get trade history for a pot
  router.get("/trades", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const potId = typeof req.query.potId === "string" ? req.query.potId : "";
      if (!potId) {
        res.status(400).json({ error: "potId query param required" });
        return;
      }
      const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : 50;
      const trades = await service.getTrades(potId, limit);
      res.json(trades.map((t) => ({
        id: t.id,
        potId: t.potId,
        marketId: t.marketId,
        symbol: t.symbol,
        side: t.side,
        price: Number(t.price),
        quantity: Number(t.quantity),
        ts: t.ts.toISOString(),
      })));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  // GET /studio/orders — get orders for a pot (optionally filter by status)
  router.get("/orders", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const potId = typeof req.query.potId === "string" ? req.query.potId : "";
      if (!potId) {
        res.status(400).json({ error: "potId query param required" });
        return;
      }
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const orders = await service.getOrders(potId, status as any);
      res.json(orders.map((o) => ({
        id: o.id,
        potId: o.potId,
        marketId: o.marketId,
        exchangeOrderId: o.exchangeOrderId,
        price: Number(o.price),
        quantity: Number(o.quantity),
        filled: Number(o.filled),
        side: o.side,
        status: o.status,
        expiresAtNs: o.expiresAtNs,
        createdAt: o.createdAt.toISOString(),
      })));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  return router;
}