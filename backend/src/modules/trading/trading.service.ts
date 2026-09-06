import { type DataSource } from "typeorm";
import { v4 as uuid } from "uuid";
import { maxUint256 } from "viem";
import { ORDER_TYPE, type SomniaMarkets, type MarketOnchain } from "@somnia-chain/markets-sdk";
import { Pot } from "../pots/pot.entity.js";
import { Epoch } from "../epochs/epoch.entity.js";
import { Position } from "./position.entity.js";
import { Order } from "./order.entity.js";
import { Trade } from "./trade.entity.js";
import { createTradingExchange } from "../dreamdex/exchange.js";
import { derivePotKey } from "../dreamdex/keys.js";
import { ensureGas } from "../dreamdex/fund.js";
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
function orderExpiryNs(poolExpiryNs: bigint, expiresInSec = 300): bigint {
  const nowNs = BigInt(Math.floor(Date.now() / 1000)) * NS_PER_SEC;
  const want = nowNs + BigInt(expiresInSec) * NS_PER_SEC;
  return want < poolExpiryNs ? want : poolExpiryNs;
}

interface PlacedFill {
  filled: number;
  yesPrice: number; // avg YES-implied fill price (0-1)
}

export class TradingService {
  private potRepo;
  private epochRepo;
  private positionRepo;
  private orderRepo;
  private tradeRepo;

  constructor(private dataSource: DataSource) {
    this.potRepo = dataSource.getRepository(Pot);
    this.epochRepo = dataSource.getRepository(Epoch);
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
    expiresInSec?: number;
  }): Promise<{ orderId: string; filled: number; price: number }> {
    return withPotLock(input.potId, async () => {
      const pot = await this.potRepo.findOne({ where: { id: input.potId } });
      if (!pot) throw new Error("Pot not found");

      // Tradability is determined by the epoch, not the pot row.
      const epoch = await this.epochRepo.findOne({ where: { id: pot.epochId } });
      if (!epoch || epoch.status !== "live") {
        throw new Error("Pot's epoch is not live");
      }

      // The pot signer needs native STT gas to sign orders.
      await ensureGas(pot.signerAddress);

      // Risk caps
      if (input.sizeUsd <= 0) throw new Error("sizeUsd must be positive");
      const isBuy = input.side.startsWith("buy");
      if (isBuy && input.sizeUsd > Number(pot.cash)) {
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

      // IOC (orderType=2) MUST cross the spread or the pool reverts.
      // The SDK's `price` parameter is ALWAYS in YES terms, regardless of side.
      // For BUY_YES: price = max YES price we'll pay (e.g. 0.99 = cross up to 99c YES ask)
      // For BUY_NO:  price = 1 − max NO price (e.g. buying NO at ≤0.99 means YES price ≤ 0.01)
      // For SELL_YES: price = min YES price we'll accept (e.g. 0.01 = accept down to 1c YES bid)
      // For SELL_NO:  price = 1 − min NO price (e.g. selling NO at ≥0.01 means YES price ≥ 0.99)
      const binarySide = SIDE_TO_BINARY[input.side];
      const isNo = binarySide.endsWith("_NO");

      let executionPrice: number;
      if (input.maxPrice != null) {
        // User-supplied maxPrice is in the outcome's own terms (NO price for BUY_NO/SELL_NO).
        // Convert to YES terms for the SDK.
        executionPrice = isNo ? 1 - input.maxPrice : input.maxPrice;
      } else {
        // Wide cap/floor: cross the entire book.
        executionPrice = isBuy ? (isNo ? 0.01 : 0.99) : (isNo ? 0.99 : 0.01);
      }

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

      // SDK handles approve + operator via autoApprove: true.
      await ensureGas(pot.signerAddress);

      // Place order via SDK (uses realtime_sendRawTransaction which works on Somnia).
      // The SDK handles approve + sign + broadcast internally.
      const sdkResult = await exchange.trader.placeOrder({
        pool: onchain.pool,
        side: binarySide as any,
        price: rawPrice,
        quantity: rawQty,
        orderType: ORDER_TYPE.MARKET,
        autoApprove: true,
      });

      const result = {
        hash: sdkResult.hash ?? "",
        orderId: sdkResult.orderId ?? null,
        fills: (sdkResult.fills ?? []).map((f: any) => ({
          takerOrderId: f.takerOrderId,
          makerOrderId: f.makerOrderId,
          quantityFilled: f.quantityFilled,
          fillPrice: f.fillPrice,
          takerRemainingQuantity: f.takerRemainingQuantity,
          makerRemainingQuantity: f.makerRemainingQuantity,
        })),
      };

      const totalFilledRaw = result.fills.reduce((sum, f) => sum + f.quantityFilled, 0n);
      const totalFilled = Number(totalFilledRaw) / 10 ** decimals;

      // Weighted-average fill price in YES terms (0-1 human scale).
      let yesPrice = executionPrice;
      if (result.fills.length > 0) {
        const weighted = result.fills.reduce((acc, f) => acc + (Number(f.quantityFilled) / 10 ** decimals) * (Number(f.fillPrice) / 10 ** decimals), 0);
        if (totalFilledRaw > 0n) yesPrice = weighted / (Number(totalFilledRaw) / 10 ** decimals);
      }
      // costPerContract is the price in the outcome's own terms (NO price for BUY_NO/SELL_NO).
      const costPerContract = isNo ? 1 - yesPrice : yesPrice;

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
        expiresAtNs: String(onchain.expiry * 1_000_000_000n),
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

        const fillResult = await this.applyFill(pot, input, filled, yesPrice, isBuy);

        // Update pot cash/deployed/nav/lpPrice
        // costPerContract is always in the outcome's own terms (NO price for NO sides, YES price for YES sides)
        const costPerContract = isNo ? 1 - yesPrice : yesPrice;
        const value = filled * costPerContract;
        if (isBuy) {
          pot.cash = Number(pot.cash) - value;
          pot.deployed = Number(pot.deployed) + value;
        } else {
          pot.cash = Number(pot.cash) + value;
          pot.deployed = Math.max(0, Number(pot.deployed) - fillResult.deployedDelta);
        }
        pot.nav = Number(pot.cash) + Number(pot.deployed);
        if (Number(pot.sharesOutstanding) > 0) {
          pot.lpPrice = Number(pot.nav) / Number(pot.sharesOutstanding);
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
  ): Promise<{ deployedDelta: number }> {
    const side: "up" | "down" = input.side.includes("up") ? "up" : "down";
    const isNo = input.side.includes("down");
    const costPerContract = isNo ? 1 - yesPrice : yesPrice;

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
      return { deployedDelta: value };
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
      // Return cost basis of sold contracts for deployed tracking
      return { deployedDelta: closing * Number(position.avgPrice) };
    }
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
   * One-time fix: correct avgPrice for existing "down" positions that were
   * stored with the wrong formula (YES price instead of NO price).
   * Recalculates from trade history and fixes pot accounting.
   */
  static async fixDownPositionAvgPrices(dataSource: DataSource): Promise<void> {
    const positionRepo = dataSource.getRepository(Position);
    const tradeRepo = dataSource.getRepository(Trade);
    const potRepo = dataSource.getRepository(Pot);
    const badPositions = await positionRepo.find({
      where: { side: "down", status: "open" },
    });

    // Group by pot to fix pot accounting
    const potsToFix = new Map<string, { positions: Position[]; trades: Trade[] }>();

    let fixed = 0;
    for (const pos of badPositions) {
      // Recalculate avgPrice from trade history for this position
      const trades = await tradeRepo.find({
        where: { potId: pos.potId, marketId: pos.marketId, side: "buy_down" },
        order: { ts: "ASC" },
      });

      if (trades.length === 0) continue;

      // Sum up weighted cost: each trade's cost = filled * (1 - yesPrice)
      // because the old code stored yesPrice but should have stored 1 - yesPrice
      let totalCost = 0;
      let totalContracts = 0;
      for (const t of trades) {
        const filled = Number(t.quantity);
        const yesPrice = Number(t.price);
        // Old code used yesPrice as costPerContract for buy_down (wrong)
        // Correct cost is 1 - yesPrice (NO price)
        totalCost += filled * (1 - yesPrice);
        totalContracts += filled;
      }

      if (totalContracts > 0) {
        const correctAvg = totalCost / totalContracts;
        const oldAvg = Number(pos.avgPrice);
        pos.avgPrice = correctAvg;
        await positionRepo.save(pos);
        fixed++;
        logger.info(`Fixed down position ${pos.id}: avgPrice ${oldAvg} → ${correctAvg} (recalculated from ${trades.length} trades)`);

        // Track pot for deployed recalculation
        if (!potsToFix.has(pos.potId)) {
          potsToFix.set(pos.potId, { positions: [], trades: [] });
        }
        potsToFix.get(pos.potId)!.positions.push(pos);
        potsToFix.get(pos.potId)!.trades.push(...trades);
      }
    }

    // Recalculate deployed for affected pots
    for (const [potId, { positions }] of potsToFix) {
      const pot = await potRepo.findOne({ where: { id: potId } });
      if (!pot) continue;

      // Recalculate deployed as sum of (contracts * avgPrice) for all open positions
      const allOpen = await positionRepo.find({
        where: { potId, status: "open" },
      });
      let newDeployed = 0;
      for (const p of allOpen) {
        newDeployed += Number(p.contracts) * Number(p.avgPrice);
      }

      const oldDeployed = Number(pot.deployed);
      pot.deployed = newDeployed;
      pot.nav = Number(pot.cash) + newDeployed;
      if (Number(pot.sharesOutstanding) > 0) {
        pot.lpPrice = Number(pot.nav) / Number(pot.sharesOutstanding);
      }
      await potRepo.save(pot);
      logger.info(`Recalculated pot ${potId}: deployed ${oldDeployed} → ${newDeployed}, nav → ${pot.nav}, lpPrice → ${pot.lpPrice}`);
    }

    if (fixed > 0) {
      logger.info(`Fixed ${fixed} down positions with wrong avgPrice`);
    }
  }
}