import OpenAI from "openai";
import { z } from "zod";
import { type DataSource } from "typeorm";
import { env } from "../../config/env.js";
import { Pot } from "../pots/pot.entity.js";
import { loadLiveBinaryMarkets, fetchPrice, fetchOrderBook } from "../dreamdex/market.service.js";
import { TradingService } from "../trading/trading.service.js";
import { logger } from "../../lib/logger.js";

export interface AiDecision {
  side: "buy_up" | "buy_down" | "hold";
  marketId: string;
  symbol: string;
  sizeUsd: number;
  maxPrice: number;
  confidence: number;
  rationale: string;
}

const AiDecisionSchema = z.object({
  side: z.enum(["buy_up", "buy_down", "hold"]),
  marketId: z.string(),
  symbol: z.string(),
  sizeUsd: z.number().min(0),
  maxPrice: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
});

// Risk caps per pot strategy.risk level
const RISK_CAPS = {
  conservative: { maxSinglePct: 0.05, stopLossPct: 0.15, minConfidence: 0.6 },
  balanced: { maxSinglePct: 0.10, stopLossPct: 0.25, minConfidence: 0.55 },
  aggressive: { maxSinglePct: 0.20, stopLossPct: 0.40, minConfidence: 0.5 },
} as const;

const MIN_LEFT_SEC = 300;
const MAX_CANDIDATES = 8;

export class AiAgentService {
  private openai: OpenAI | null = null;
  private tradingService: TradingService;
  private potRepo;

  constructor(dataSource: DataSource) {
    this.tradingService = new TradingService(dataSource);
    this.potRepo = dataSource.getRepository(Pot);
    if (env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: env.OPENAI_URL });
    }
  }

  /**
   * Run a single AI trading cycle for a pot.
   * Gathers structured market data → calls OpenAI → enforces hard risk caps →
   * executes a price-capped IOC via the trading service.
   */
  async runCycle(potId: string): Promise<AiDecision | null> {
    if (!this.openai) {
      logger.warn("OpenAI not configured — skipping AI cycle");
      return null;
    }

    try {
      const pot = await this.potRepo.findOne({ where: { id: potId } });
      if (!pot) return null;
      if (pot.status !== "live") return null;

      const caps = RISK_CAPS[pot.strategy?.risk ?? "balanced"];
      const cash = Number(pot.cash);

      // Hard stop-loss: NAV vs baseline (sharesOutstanding ≈ total deposits at 1:1).
      const baseline = Number(pot.sharesOutstanding);
      const nav = Number(pot.nav);
      if (baseline > 0 && nav < baseline * (1 - caps.stopLossPct)) {
        logger.info(`AI pot ${potId} hit stop-loss (nav=${nav}, baseline=${baseline}) — halting trading`);
        return null;
      }

      if (cash <= 1) {
        logger.info(`AI pot ${potId} has no deployable cash`);
        return null;
      }

      // 1. Gather structured market data
      const markets = await loadLiveBinaryMarkets();
      const now = Date.now();
      const candidates = markets
        .filter((m) => m.status === "trading")
        .filter((m) => new Date(m.expiry).getTime() - now > MIN_LEFT_SEC * 1000)
        .sort((a, b) => b.volume - a.volume)
        .slice(0, MAX_CANDIDATES);

      if (candidates.length === 0) {
        logger.info("No suitable live markets for AI cycle");
        return null;
      }

      const btcPrice = await fetchPrice("BTC");
      const ethPrice = await fetchPrice("ETH");

      const marketContext = [];
      for (const m of candidates) {
        const book = await fetchOrderBook(m.symbol, 3);
        const bestBid = book.bids[0]?.[0];
        const bestAsk = book.asks[0]?.[0];
        const mid = bestBid != null && bestAsk != null ? (bestBid + bestAsk) / 2 : 0.5;
        const spread = bestBid != null && bestAsk != null ? bestAsk - bestBid : null;
        marketContext.push(
          `- ${m.id}: asset=${m.asset}, expiry=${new Date(m.expiry).toISOString()}, ` +
          `volume=${Math.round(m.volume)}, yesMid=${mid.toFixed(3)}, spread=${spread?.toFixed(3) ?? "n/a"}`,
        );
      }

      // 2. Build prompt
      const systemPrompt = `You are an AI trading agent for a prediction-market pot on DreamDEX.
You trade binary "Up or Down" event contracts on BTC and ETH prices. Each contract pays 1 USDso if correct, else 0.
You manage a pot funded by real followers — trade conservatively and only when you have a genuine edge.
The pot's risk level is ${pot.strategy?.risk ?? "balanced"}.
Output ONLY valid JSON matching: { "side": "buy_up"|"buy_down"|"hold", "marketId": "...", "symbol": "...", "sizeUsd": number, "maxPrice": number, "confidence": 0..1, "rationale": "..." }
- maxPrice is the MAX probability price you will pay for the chosen side (0..1).
- Choose "hold" if no market offers a clear edge. Never force a trade.`;

      const userPrompt = `Pot status: cash=${cash.toFixed(2)} USDso, nav=${nav.toFixed(2)}.
BTC spot: ${btcPrice ? `$${btcPrice}` : "unknown"}. ETH spot: ${ethPrice ? `$${ethPrice}` : "unknown"}.
Max single-trade size: ${(cash * caps.maxSinglePct).toFixed(2)} USDso.

Candidate markets:
${marketContext.join("\n")}

Decide the single best trade (or hold). Output only valid JSON.`;

      // 3. Call OpenAI
      const completion = await this.openai.chat.completions.create({
        model: env.OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        logger.warn("Empty AI response");
        return null;
      }

      // 4. Validate decision structure
      const parsed = AiDecisionSchema.safeParse(JSON.parse(content));
      if (!parsed.success) {
        logger.warn({ content }, "Invalid AI decision structure");
        return null;
      }
      const decision = parsed.data;

      if (decision.side === "hold") return decision;

      // 5. Enforce hard risk caps
      if (decision.confidence < caps.minConfidence) {
        logger.info(`AI confidence too low (${decision.confidence.toFixed(2)} < ${caps.minConfidence}) — skipping`);
        return decision;
      }

      const maxSize = cash * caps.maxSinglePct;
      const sizeUsd = Math.min(decision.sizeUsd, maxSize);
      if (sizeUsd <= 0) return decision;

      // 6. Execute a price-capped IOC
      // maxPrice is in the SIDE's own terms; convert to the YES-implied cap the
      // trading service expects (buy_up = YES price, buy_down = 1 − NO price).
      const yesCap = decision.side === "buy_up" ? decision.maxPrice : 1 - decision.maxPrice;

      const result = await this.tradingService.executeTrade({
        potId,
        marketId: decision.marketId,
        side: decision.side as "buy_up" | "buy_down",
        sizeUsd,
        maxPrice: yesCap,
        orderType: "ioc",
      });

      logger.info(`AI trade executed: ${decision.side} ${result.filled} contracts for pot ${potId} (${decision.rationale})`);
      return decision;
    } catch (err) {
      logger.error(err, `AI agent cycle failed for pot ${potId}`);
      return null;
    }
  }
}