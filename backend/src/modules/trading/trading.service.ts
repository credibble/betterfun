import { type DataSource } from "typeorm";
import { v4 as uuid } from "uuid";
import { ORDER_TYPE, type SomniaMarkets, type MarketOnchain } from "@somnia-chain/markets-sdk";
import { Pot } from "../pots/pot.entity.js";
import { Position } from "./position.entity.js";
import { Order } from "./order.entity.js";
import { Trade } from "./trade.entity.js";
import { createTradingExchange } from "../dreamdex/exchange.js";
import { derivePotKey } from "../dreamdex/keys.js";
import { ensureGas } from "../dreamdex/fund.js";
import { env } from "../../config/env.js";
import { broadcast } from "../realtime/ws-hub.js";
import { logger } from "../../lib/logger.js";

// Per-pot write lock — serializes trading operations to avoid nonce races
const potLocks = new Map<string, Promise<void>>();

// Exchange instance cache — avoids re-creating + loadMarkets for every trade
const exchangeCache = new Map<number, SomniaMarkets>();

async function withPotLock<T>(potId: string, fn: () => Promise<T>): Promise<T> {
  const existing = potLocks.get(potId);
  if (existing) await existing;

  let release!: () => void;
  const lock = new Promise<void>((resolve) => {
    release = resolve;
  });
  potLocks.set(potId, lock);

  try {
    return await fn();
  } finally {
    release();
    potLocks.delete(potId);
  }
}

function getOrCreateExchange(signerIndex: number): SomniaMarkets {
  let exchange = exchangeCache.get(signerIndex);
  if (!exchange) {
    const privateKey = derivePotKey(signerIndex) as `0x${string}`;
    exchange = createTradingExchange(privateKey);
    exchangeCache.set(signerIndex, exchange);
  }
  return exchange;
}

const SIDE_TO_BINARY: Record<string, "BUY_YES" | "BUY_NO" | "SELL_YES" | "SELL_NO"> = {
  buy_up: "BUY_YES",
  buy_down: "BUY_NO",
  sell_up: "SELL_YES",
  sell_down: "SELL_NO",
};

/** Snap a human price (0-1) to the venue's tick grid, in raw units. */
function priceToRaw(humanPrice: number, decimals: number, tickSize: bigint, ceil = false): bigint {
  const raw = BigInt(Math.floor(humanPrice * 10 ** decimals));
  if (tickSize <= 0n) return raw;
  const snapped = ceil
    ? raw + ((tickSize - (raw % tickSize)) % tickSize)
    : raw - (raw % tickSize);
  return snapped < 0n ? 0n : snapped;
}

/** Snap a human quantity (contracts) to the venue's lot grid, in raw units. */
function qtyToRaw(humanQty: number, decimals: number, lotSize: bigint, minQuantity: bigint): bigint {
  const raw = BigInt(Math.floor(humanQty * 10 ** decimals));
  if (raw <= 0n) return 0n;
  const floored = lotSize > 0n ? raw - (raw % lotSize) : raw;
  return floored < minQuantity ? 0n : floored;
}

const NS_PER_SEC = 1_000_000_000n;

/** Expiry in ns, capped at market expiry. Uses a 300s dead-man's switch. */
function orderExpiryNs(onchain: MarketOnchain, expiresInSec = 300): bigint {
  const nowNs = BigInt(Date.now()) * NS_PER_SEC;
  const marketExpiryNs = onchain.expiry * NS_PER_SEC; // expiry is unix seconds on-chain
  const want = nowNs + BigInt(expiresInSec) * NS_PER_SEC;
  return want < marketExpiryNs ? want : marketExpiryNs;
}

interface PlacedFill {
  filled: number;
  yesPrice: number; // avg YES-implied fill price (0-1)
}

export class TradingService {
  private potRepo;
  private positionRepo;
  private orderRepo;
  private tradeRepo;

  constructor(private dataSource: DataSource) {
    this.potRepo = dataSource.getRepository(Pot);
    this.positionRepo = dataSource.getRepository(Position);
    this.orderRepo = dataSource.getRepository(Order);
    this.tradeRepo = dataSource.getRepository(Trade);
  }

  /**
   * Execute a trade on behalf of a pot — serialized per pot.
   * Uses the raw trader tier: gates on on-chain status, snaps to the venue's
   * tick/lot grid, and executes as a price-capped IOC.
   */
  async executeTrade(input: {
    potId: string;
    marketId: string;
    side: "buy_up" | "buy_down" | "sell_up" | "sell_down";
    sizeUsd: number;
    maxPrice?: number;
    orderType?: "ioc" | "post_only" | "limit";
    expiresInSec?: number;
  }): Promise<{ orderId: string; filled: number; price: number }> {
    return withPotLock(input.potId, async () => {
      const pot = await this.potRepo.findOne({ where: { id: input.potId } });
      if (!pot) throw new Error("Pot not found");
      if (pot.status !== "live") throw new Error("Pot is not in live status");

      // The pot signer needs native STT gas to sign orders.
      await ensureGas(pot.signerAddress);

      // Risk caps
      if (input.sizeUsd <= 0) throw new Error("sizeUsd must be positive");
      if (input.sizeUsd > Number(pot.cash)) {
        throw new Error(`Insufficient cash: ${pot.cash} USDC available, ${input.sizeUsd} requested`);
      }

      const exchange = getOrCreateExchange(pot.signerIndex);
      if (!exchangeCache.has(pot.signerIndex)) {
        await exchange.loadMarkets(true);
      }

      // Resolve market + gate on on-chain status === Trading (1)
      const onchain = await exchange.client.getMarketOnchain(input.marketId as `0x${string}`);
      if (onchain.status !== 1) {
        throw new Error(`Market ${input.marketId} is not trading (status ${onchain.status})`);
      }
      const minLeftSec = Number(onchain.expiry - BigInt(Math.floor(Date.now() / 1000)));
      if (minLeftSec < 300) {
        throw new Error(`Market ${input.marketId} expires too soon (${minLeftSec}s left)`);
      }

      const decimals = onchain.decimals ?? 6;
      const params = await exchange.client.getBinaryBookParams(onchain.pool);

      // Price cap: buys pay at most maxPrice (or the ask); sells accept at least maxPrice.
      const binarySide = SIDE_TO_BINARY[input.side];
      const isBuy = binarySide.startsWith("BUY");

      let executionPrice = input.maxPrice ?? 0.5;
      if (input.maxPrice == null) {
        try {
          const book = await exchange.fetchOrderBook(input.marketId, 1);
          const bestBid = book.bids?.[0]?.[0];
          const bestAsk = book.asks?.[0]?.[0];
          if (isBuy && bestAsk != null) executionPrice = bestAsk;
          else if (!isBuy && bestBid != null) executionPrice = bestBid;
        } catch {
          executionPrice = 0.5;
        }
      }
      if (isBuy) executionPrice = Math.min(0.99, Math.max(0.01, executionPrice));
      else executionPrice = Math.min(0.99, Math.max(0.01, executionPrice));

      const rawPrice = priceToRaw(executionPrice, decimals, params.tickSize, !isBuy);
      const rawQty = qtyToRaw(input.sizeUsd, decimals, params.lotSize, params.minQuantity);
      if (rawQty === 0n) {
        throw new Error(`Requested size ${input.sizeUsd} is below one lot on this venue`);
      }

      // For sells, ensure the pot actually holds the tokens.
      if (!isBuy) {
        const side = input.side.includes("up") ? "up" : "down";
        const held = await exchange.client.getOutcomeBalance({
          outcomeToken: onchain.outcomeToken,
          account: pot.signerAddress as `0x${string}`,
          id: side === "up" ? onchain.yesId : onchain.noId,
        });
        if (held < rawQty) {
          throw new Error(`Pot holds ${Number(held) / 10 ** decimals} contracts; cannot sell ${input.sizeUsd}`);
        }
      }

      const orderType =
        input.orderType === "post_only"
          ? ORDER_TYPE.POST_ONLY
          : input.orderType === "limit"
            ? ORDER_TYPE.LIMIT
            : ORDER_TYPE.MARKET; // IOC

      const result = await exchange.trader.placeOrder({
        pool: onchain.pool,
        side: binarySide,
        price: rawPrice,
        quantity: rawQty,
        outcomeToken: onchain.outcomeToken,
        yesId: onchain.yesId,
        noId: onchain.noId,
        orderType,
        expireTimestampNs: orderExpiryNs(onchain, input.expiresInSec),
      });

      if (result.receipt?.status === "reverted") {
        throw new Error(`Order reverted on chain: ${input.marketId}`);
      }

      const totalFilledRaw = result.fills.reduce((sum, f) => sum + f.quantityFilled, 0n);
      const totalFilled = Number(totalFilledRaw) / 10 ** decimals;

      // Weighted-average fill price in YES terms.
      let yesPrice = executionPrice;
      if (result.fills.length > 0) {
        const weighted = result.fills.reduce((acc, f) => acc + Number(f.quantityFilled) * (Number(f.fillPrice) / 10 ** decimals), 0);
        if (totalFilledRaw > 0n) yesPrice = weighted / (Number(totalFilledRaw) / 10 ** decimals);
      }
      const costPerContract = isBuy ? yesPrice : 1 - yesPrice;

      const filled = totalFilled;
      const status: Order["status"] =
        filled <= 0 ? "cancelled" : result.orderId != null && result.fills.length === 0 ? "cancelled" : filled >= input.sizeUsd * 0.999 ? "filled" : "partial";

      // Record order
      const dbOrder = this.orderRepo.create({
        id: uuid(),
        potId: input.potId,
        marketId: input.marketId,
        symbol: input.marketId,
        exchangeOrderId: result.orderId != null ? String(result.orderId) : undefined,
        price: yesPrice,
        quantity: input.sizeUsd,
        filled,
        side: input.side,
        status,
        expiresAtNs: String(orderExpiryNs(onchain, input.expiresInSec)),
      });
      await this.orderRepo.save(dbOrder);

      if (filled > 0) {
        const dbTrade = this.tradeRepo.create({
          id: uuid(),
          potId: input.potId,
          marketId: input.marketId,
          symbol: input.marketId,
          side: input.side,
          price: yesPrice,
          quantity: filled,
          ts: new Date(),
        });
        await this.tradeRepo.save(dbTrade);

        await this.applyFill(pot, input, filled, yesPrice, isBuy);

        // Update pot cash/deployed
        const value = filled * (isBuy ? yesPrice : 1 - yesPrice);
        if (isBuy) {
          pot.cash = Number(pot.cash) - value;
          pot.deployed = Number(pot.deployed) + value;
        } else {
          pot.cash = Number(pot.cash) + value;
          pot.deployed = Math.max(0, Number(pot.deployed) - value);
        }
        await this.potRepo.save(pot);

        // Realtime push
        broadcast(`pot:${pot.id}`, {
          type: "pot:update",
          potId: pot.id,
          nav: Number(pot.nav),
          cash: Number(pot.cash),
          deployed: Number(pot.deployed),
          lpPrice: Number(pot.lpPrice),
        });
        broadcast(`pot:${pot.id}`, {
          type: "trade:update",
          potId: pot.id,
          trade: {
            id: dbTrade.id,
            potId: pot.id,
            marketId: dbTrade.marketId,
            symbol: dbTrade.marketId,
            side: dbTrade.side,
            price: yesPrice,
            quantity: filled,
            ts: dbTrade.ts.toISOString(),
          },
        });
      }

      logger.info(`Trade executed: ${input.side} ${filled} contracts of ${input.marketId} for pot ${input.potId}`);
      return { orderId: dbOrder.id, filled, price: yesPrice };
    });
  }

  /**
   * Apply a fill to the pot's position ledger.
   * BUY_YES → position up, weighted avg price by cost.
   * BUY_NO  → position down, weighted avg price by cost.
   * SELL_*  → reduce position; if fully closed, mark resolved with realized PnL.
   */
  private async applyFill(
    pot: Pot,
    input: { marketId: string; side: string },
    filled: number,
    yesPrice: number,
    isBuy: boolean,
  ): Promise<void> {
    const side: "up" | "down" = input.side.includes("up") ? "up" : "down";
    const costPerContract = isBuy ? yesPrice : 1 - yesPrice;

    let position = await this.positionRepo.findOne({
      where: { potId: pot.id, marketId: input.marketId, side },
    });

    if (isBuy) {
      const value = filled * costPerContract;
      if (position) {
        const totalContracts = Number(position.contracts) + filled;
        const totalCost = Number(position.avgPrice) * Number(position.contracts) + value;
        position.avgPrice = totalContracts > 0 ? totalCost / totalContracts : costPerContract;
        position.contracts = totalContracts;
      } else {
        position = this.positionRepo.create({
          id: uuid(),
          potId: pot.id,
          marketId: input.marketId,
          symbol: input.marketId,
          side,
          contracts: filled,
          avgPrice: costPerContract,
          status: "open",
          realizedPnl: 0,
        });
      }
      await this.positionRepo.save(position);

      broadcast(`pot:${pot.id}`, {
        type: "position:update",
        potId: pot.id,
        position: {
          id: position.id,
          potId: position.potId,
          marketId: position.marketId,
          symbol: position.marketId,
          side: position.side,
          contracts: Number(position.contracts),
          avgPrice: Number(position.avgPrice),
          status: position.status,
          realizedPnl: Number(position.realizedPnl),
          win: position.win,
          createdAt: position.createdAt.toISOString(),
          updatedAt: position.updatedAt.toISOString(),
        },
      });
    } else {
      if (!position) throw new Error("Cannot sell: no open position on this side");
      const closing = Math.min(Number(position.contracts), filled);
      const proceeds = closing * costPerContract;
      position.realizedPnl = Number(position.realizedPnl) + (proceeds - closing * Number(position.avgPrice));
      position.contracts = Number(position.contracts) - closing;
      if (Number(position.contracts) <= 0) {
        position.status = "resolved";
        position.contracts = 0;
      }
      await this.positionRepo.save(position);
    }
  }

  /**
   * Cancel a resting order by its on-chain id for a pot.
   */
  async cancelOrder(input: { potId: string; orderId: string }): Promise<{ ok: boolean }> {
    return withPotLock(input.potId, async () => {
      const order = await this.orderRepo.findOne({ where: { id: input.orderId, potId: input.potId } });
      if (!order) throw new Error("Order not found");
      if (!order.exchangeOrderId) throw new Error("Order has no on-chain id");
      if (order.status === "cancelled" || order.status === "filled" || order.status === "expired") {
        throw new Error(`Order already ${order.status}`);
      }

      const pot = await this.potRepo.findOne({ where: { id: input.potId } });
      if (!pot) throw new Error("Pot not found");

      const exchange = getOrCreateExchange(pot.signerIndex);
      if (!exchangeCache.has(pot.signerIndex)) {
        await exchange.loadMarkets(true);
      }

      const onchain = await exchange.client.getMarketOnchain(order.marketId as `0x${string}`);
      const res = await exchange.trader.cancelOrder({
        pool: onchain.pool,
        orderId: BigInt(order.exchangeOrderId),
      });
      if (res.receipt?.status === "reverted") {
        throw new Error("Cancel reverted on chain");
      }

      order.status = "cancelled";
      await this.orderRepo.save(order);
      return { ok: true };
    });
  }

  /**
   * Get open positions for a pot.
   */
  async getPositions(potId: string): Promise<Position[]> {
    return this.positionRepo.find({
      where: { potId, status: "open" },
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Get trade history for a pot.
   */
  async getTrades(potId: string, limit: number = 50): Promise<Trade[]> {
    return this.tradeRepo.find({
      where: { potId },
      order: { ts: "DESC" },
      take: limit,
    });
  }

  /**
   * Get orders for a pot (open + recent).
   */
  async getOrders(potId: string, status?: Order["status"]): Promise<Order[]> {
    const where: Record<string, unknown> = { potId };
    if (status) where.status = status;
    return this.orderRepo.find({
      where,
      order: { createdAt: "DESC" },
      take: 100,
    });
  }
}