import { getReadExchange } from "./exchange.js";
import { isBinaryMarket } from "@somnia-chain/markets-sdk";
import { logger } from "../../lib/logger.js";

export interface LiveMarketInfo {
  id: string;
  symbol: string;
  asset: string;
  question: string;
  strike: string;
  intervalSec: number;
  expiry: string;
  upSymbol: string;
  downSymbol: string;
  upPrice: number;
  downPrice: number;
  volume: number;
  status: "listed" | "trading" | "locked" | "resolved" | "voided";
  poolAddress: string;
}

/**
 * Load all live binary markets filtered to BTC/ETH.
 */
export async function loadLiveBinaryMarkets(): Promise<LiveMarketInfo[]> {
  const exchange = getReadExchange();
  try {
    console.log("Loading live binary markets from DreamDEX");
    const all = await exchange.loadMarkets(true);
    console.log(`Loaded ${Object.keys(all).length} markets from DreamDEX`);

    const results: LiveMarketInfo[] = [];
    for (const m of Object.values(all)) {
      if (!m.active || !isBinaryMarket(m.info)) continue;

      const info = m.info;
      const asset = m.symbol?.split("-")[0];
      if (asset !== "BTC" && asset !== "ETH") continue;

      const onchain = await exchange.client.getMarketOnchain(
        info.marketId as `0x${string}`,
      );

      let status: LiveMarketInfo["status"] = "listed";
      if (onchain.status === 0) status = "listed";
      else if (onchain.status === 1) status = "trading";
      else if (onchain.status === 2) status = "locked";
      else if (onchain.status === 4) status = "resolved";
      else if (onchain.status === 5) status = "voided";

      // Skip resolved, voided, and expired markets
      if (status === "resolved" || status === "voided") continue;

      // Also skip markets past their expiry time
      const expiryTs = Number(info.expiry ?? 0);
      if (expiryTs > 0 && expiryTs * 1000 < Date.now()) continue;

      const upOutcome = m.outcomes?.[0];
      const downOutcome = m.outcomes?.[1];

      // Fetch real mid price from order book (chain-tier read, no watch needed)
      let upPrice = 0.5;
      let downPrice = 0.5;
      try {
        const book = await exchange.fetchOrderBook(m.symbol, 1);
        console.log(
          `Fetched order book for ${m.symbol}: ${book.bids.length} bids, ${book.asks.length} asks`,
        );
        const bestBid = book.bids?.[0]?.[0];
        const bestAsk = book.asks?.[0]?.[0];
        if (bestBid != null && bestAsk != null) {
          const mid = (Number(bestBid) + Number(bestAsk)) / 2;
          upPrice = Math.max(0.01, Math.min(0.99, mid));
          downPrice = 1 - upPrice;
        }
      } catch {
        // Book unavailable — keep default 0.5
      }

      results.push({
        id: info.marketId,
        symbol: m.symbol ?? "",
        asset,
        question: (info as any).question ?? "",
        strike: String((info as any).strike ?? "0"),
        intervalSec: Number(info.intervalSec ?? 3600),
        expiry: String(info.expiry ?? ""),
        upSymbol: upOutcome?.symbol ?? "",
        downSymbol: downOutcome?.symbol ?? "",
        upPrice,
        downPrice,
        volume: Number(
          (info as unknown as { cumulativeQuoteVolume?: string })
            .cumulativeQuoteVolume ?? "0",
        ),
        status,
        poolAddress: onchain.pool ?? "",
      });
    }

    return results;
  } catch (err) {
    logger.error(err, "Failed to load live binary markets");
    return [];
  }
}

/**
 * Fetch order book for a symbol.
 */
export async function fetchOrderBook(
  symbol: string,
  depth: number = 5,
): Promise<{ bids: Array<[number, number]>; asks: Array<[number, number]> }> {
  const exchange = getReadExchange();
  try {
    const book = await exchange.fetchOrderBook(symbol, depth);
    return {
      bids: book.bids.map(([price, qty]) => [Number(price), Number(qty)]),
      asks: book.asks.map(([price, qty]) => [Number(price), Number(qty)]),
    };
  } catch (err) {
    logger.error(err, `Failed to fetch order book for ${symbol}`);
    return { bids: [], asks: [] };
  }
}

/**
 * Fetch candles for a pool. Uses correct SDK Candle field names.
 */
export async function fetchCandles(
  pool: string,
  intervalSec: number = 60,
  limit: number = 100,
): Promise<
  Array<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>
> {
  const exchange = getReadExchange();
  try {
    const candles = await exchange.client.getCandles(pool, intervalSec, {
      limit,
    });
    return candles.map((c) => ({
      time: Number(c.bucketStart ?? 0),
      open: Number(c.openPrice ?? 0),
      high: Number(c.high ?? 0),
      low: Number(c.low ?? 0),
      close: Number(c.closePrice ?? 0),
      volume: Number(c.quoteVolume ?? 0),
    }));
  } catch (err) {
    logger.error(err, `Failed to fetch candles for ${pool}`);
    return [];
  }
}

/**
 * Fetch recent price from the on-chain EMA oracle.
 */
export async function fetchPrice(asset: "BTC" | "ETH"): Promise<number | null> {
  const exchange = getReadExchange();
  try {
    const livePrice = exchange.client.getLivePrice(asset);
    if (!livePrice) {
      // Fallback: one-shot fetch
      const fetched = await exchange.client.fetchPrice(asset);
      return fetched?.price ?? null;
    }
    return livePrice.price;
  } catch (err) {
    logger.error(err, `Failed to fetch price for ${asset}`);
    return null;
  }
}
