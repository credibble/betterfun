import { type DataSource } from "typeorm";
import { type Hex } from "viem";
import { v4 as uuid } from "uuid";
import { Pot } from "../pots/pot.entity.js";
import { Epoch } from "../epochs/epoch.entity.js";
import { Position } from "./position.entity.js";
import { Order } from "./order.entity.js";
import { Trade } from "./trade.entity.js";
import { broadcast } from "../realtime/ws-hub.js";
import { vaultTrade, syncPotFromVault } from "../vault/vault.service.js";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

const potLocks = new Map<string, Promise<void>>();

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

const NS_PER_SEC = 1_000_000_000n;

function priceToRaw(humanPrice: number, decimals: number, tickSize: bigint, ceil = false): bigint {
  const raw = BigInt(Math.floor(humanPrice * 10 ** decimals));
  if (tickSize <= 0n) return raw;
  const snapped = ceil
    ? raw + ((tickSize - (raw % tickSize)) % tickSize)
    : raw - (raw % tickSize);
  return snapped < 0n ? 0n : snapped;
}

function qtyToRaw(humanQty: number, decimals: number, lotSize: bigint, minQuantity: bigint): bigint {
  const raw = BigInt(Math.floor(humanQty * 10 ** decimals));
  if (raw <= 0n) return 0n;
  const floored = lotSize > 0n ? raw - (raw % lotSize) : raw;
  return floored < minQuantity ? 0n : floored;
}

const SIDE_MAP: Record<string, 0 | 1 | 2 | 3> = {
  buy_up: 0,
  buy_down: 1,
  sell_up: 2,
  sell_down: 3,
};

const NO_SIDES = new Set(["buy_down", "sell_down"]);

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

      const epoch = await this.epochRepo.findOne({ where: { id: pot.epochId } });
      if (!epoch || epoch.status !== "live") {
        throw new Error("Pot's epoch is not live");
      }

      if (input.sizeUsd <= 0) throw new Error("sizeUsd must be positive");
      const isBuy = input.side.startsWith("buy");

      const vaultAddr = process.env.VAULT_ADDRESS as Hex;
      const operatorKey = env.POT_MASTER_SEED as Hex;
      if (!vaultAddr || vaultAddr === "0x0000000000000000000000000000000000000000" || !operatorKey) {
        throw new Error("VAULT_ADDRESS and POT_MASTER_SEED must be configured");
      }

      // Check vault idle balance on-chain for buys
      if (isBuy) {
        const { readVaultNav, readVaultPositionTotals } = await import("../vault/vault.service.js");
        const nav = await readVaultNav(vaultAddr);
        const { yes, no } = await readVaultPositionTotals(vaultAddr);
        const idle = nav - (yes < no ? yes : no);
        const idleUsd = Number(idle) / 1e6;
        if (input.sizeUsd > idleUsd) {
          throw new Error(`Insufficient vault balance: $${idleUsd.toFixed(2)} available, $${input.sizeUsd} requested`);
        }
      }

      // Resolve market on-chain via SDK (read-only)
      const { getReadExchange } = await import("../dreamdex/exchange.js");
      const readExchange = await getReadExchange();
      const onchain = await readExchange.client.getMarketOnchain(input.marketId as `0x${string}`);
      if (onchain.status !== 1) {
        throw new Error(`Market ${input.marketId} is not trading (status ${onchain.status})`);
      }
      const minLeftSec = Number(onchain.expiry - BigInt(Math.floor(Date.now() / 1000)));
      if (minLeftSec < 300) {
        throw new Error(`Market ${input.marketId} expires too soon (${minLeftSec}s left)`);
      }

      const decimals = onchain.decimals ?? 6;
      const params = await readExchange.client.getBinaryBookParams(onchain.pool);

      const isNo = NO_SIDES.has(input.side);
      let executionPrice: number;
      if (input.maxPrice != null) {
        executionPrice = isNo ? 1 - input.maxPrice : input.maxPrice;
      } else {
        executionPrice = isBuy ? (isNo ? 0.01 : 0.99) : (isNo ? 0.99 : 0.01);
      }

      const rawPrice = priceToRaw(executionPrice, decimals, params.tickSize, !isBuy);
      const rawQty = qtyToRaw(input.sizeUsd, decimals, params.lotSize, params.minQuantity);
      if (rawQty === 0n) {
        throw new Error(`Requested size ${input.sizeUsd} is below one lot on this venue`);
      }

      const vaultSide: 0 | 1 | 2 | 3 = SIDE_MAP[input.side];
      const poolExpiryNs = onchain.expiry * NS_PER_SEC;
      const nowNs = BigInt(Math.floor(Date.now() / 1000)) * NS_PER_SEC;
      const wantNs = nowNs + BigInt(input.expiresInSec ?? 300) * NS_PER_SEC;
      const expiryNs = wantNs < poolExpiryNs ? wantNs : poolExpiryNs;

      const receipt = await vaultTrade(
        vaultAddr,
        operatorKey,
        onchain.pool,
        vaultSide,
        rawPrice,
        rawQty,
        expiryNs,
      );
      logger.info(`Vault trade tx: ${receipt.transactionHash}`);

      const filled = input.sizeUsd;
      const yesPrice = executionPrice;

      const status: Order["status"] =
        filled <= 0 ? "cancelled" : filled >= input.sizeUsd * 0.999 ? "filled" : "partial";

      // Record order
      const dbOrder = this.orderRepo.create({
        id: uuid(),
        potId: input.potId,
        marketId: input.marketId,
        symbol: input.marketId,
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

        await this.applyFill(pot, input, filled, yesPrice, isBuy);

        // Sync pot DB fields from on-chain vault state
        await syncPotFromVault(vaultAddr, pot.id, this.dataSource);

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