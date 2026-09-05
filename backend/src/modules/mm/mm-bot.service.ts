import { env } from "../../config/env.js";
import { createTradingExchange } from "../dreamdex/exchange.js";
import { loadLiveBinaryMarkets } from "../dreamdex/market.service.js";
import { logger } from "../../lib/logger.js";

/**
 * Market Maker / Liquidity Bot
 * Provides liquidity on testnet by placing limit orders around mid price.
 * Uses IOC orders to ensure fills on testnet.
 */
export class MmBotService {
  private exchange: ReturnType<typeof createTradingExchange>;
  private running = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    const pk = env.MM_BOT_PRIVATE_KEY as `0x${string}`;
    this.exchange = createTradingExchange(pk);
  }

  async start() {
    if (this.running) return;
    this.running = true;
    logger.info("MM Bot starting");

    await this.exchange.loadMarkets(true);

    this.intervalId = setInterval(() => this.tick(), 30_000);
    await this.tick();
  }

  stop() {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    logger.info("MM Bot stopped");
  }

  private async tick() {
    if (!this.running) return;

    try {
      const markets = await loadLiveBinaryMarkets();
      const liveMarkets = markets.filter((m) => m.status === "trading");

      for (const market of liveMarkets) {
        await this.provideLiquidity(market);
      }
    } catch (err) {
      logger.error(err, "MM Bot tick failed");
    }
  }

  private async provideLiquidity(market: { id: string; symbol: string; upPrice: number }) {
    try {
      // Read mid from live order book
      const book = await this.exchange.client.getLiveBinaryOrderBookByMarket(
        market.id as `0x${string}`,
        { depth: 1 },
      );

      const bestYesBid = book.yesBids[0]?.price;
      const bestYesAsk = book.yesAsks[0]?.price;

      if (bestYesBid == null || bestYesAsk == null) {
        // No two-sided book — skip this market
        return;
      }

      const mid = Number((bestYesBid + bestYesAsk) / 2n) / 1e6;
      const spread = Number(process.env.MM_SPREAD) || 0.04;

      const bidPrice = Math.max(0.01, mid - spread / 2);
      const askPrice = Math.min(0.99, mid + spread / 2);

      const size = Number(process.env.MM_ORDER_SIZE) || 50;

      // Place IOC taker orders to provide liquidity
      try {
        const buyOrder = await this.exchange.createOrder(
          market.symbol, "limit", "buy", size, bidPrice,
          { timeInForce: "IOC" },
        );
        if (buyOrder?.id) {
          logger.debug(`MM: filled buy on ${market.symbol} @ ${bidPrice.toFixed(4)}`);
        }
      } catch {
        // IOC orders may not fill if no counterparty — that's ok
      }

      try {
        const sellOrder = await this.exchange.createOrder(
          market.symbol, "limit", "sell", size, askPrice,
          { timeInForce: "IOC" },
        );
        if (sellOrder?.id) {
          logger.debug(`MM: filled sell on ${market.symbol} @ ${askPrice.toFixed(4)}`);
        }
      } catch {
        // IOC orders may not fill — ok
      }
    } catch (err) {
      logger.error(err, `MM liquidity failed for ${market.symbol}`);
    }
  }
}
