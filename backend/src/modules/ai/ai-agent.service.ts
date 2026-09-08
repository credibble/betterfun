import OpenAI from "openai";
import { z } from "zod";
import { type DataSource } from "typeorm";
import { type Hex } from "viem";
import { env } from "../../config/env.js";
import { Pot } from "../pots/pot.entity.js";
import { Epoch } from "../epochs/epoch.entity.js";
import { loadLiveBinaryMarkets, fetchPrice, fetchOrderBook } from "../dreamdex/market.service.js";
import { getReadExchange } from "../dreamdex/exchange.js";
import { vaultTrade, readVaultNav, vaultApprovePool } from "../vault/vault.service.js";
import { derivePotKey } from "../dreamdex/keys.js";
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
const NS_PER_SEC = 1_000_000_000n;

export class AiAgentService {
  private openai: OpenAI | null = null;
  private potRepo;
  private epochRepo;

  constructor(dataSource: DataSource) {
    this.potRepo = dataSource.getRepository(Pot);
    this.epochRepo = dataSource.getRepository(Epoch);
    if (env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: env.OPENAI_API_KEY, baseURL: env.OPENAI_URL });
    }
  }

  /**
   * Run a single AI trading cycle.
   * Gathers market data → calls OpenAI → enforces risk caps →
   * executes via vault.trade() on-chain.
   */
  async runCycle(potId: string): Promise<AiDecision | null> {
    if (!this.openai) {
      logger.warn("OpenAI not configured — skipping AI cycle");
      return null;
    }

    try {
      const pot = await this.potRepo.findOne({ where: { id: potId } });
      if (!pot) return null;
      const epoch = await this.epochRepo.findOne({ where: { id: pot.epochId } });
      if (!epoch || epoch.status !== "live") return null;

      const vaultAddr = pot.vaultAddress as Hex | undefined;
      const operatorKey = derivePotKey(pot.signerIndex) as Hex | undefined;
      if (!vaultAddr || vaultAddr === "0x0000000000000000000000000000000000000000" || !operatorKey) {
        logger.warn(`Pot ${potId} vault not deployed or derivePotKey failed — skipping AI cycle`);
        return null;
      }

      const caps = RISK_CAPS[pot.strategy?.risk ?? "balanced"];

      // Read vault NAV on-chain
      let nav: number;
      try {
        const navRaw = await readVaultNav(vaultAddr);
        nav = Number(navRaw) / 1e6; // tUSDC 6 decimals
      } catch {
        logger.warn("Failed to read vault NAV — skipping cycle");
        return null;
      }

      const cash = nav; // vault NAV = deployable capital
      if (cash <= 1) {
        logger.info(`AI pot ${potId} has no deployable cash`);
        return null;
      }

      // 1. Gather market data
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
          `volume=${Math.round(m.volume)}, yesMid=${mid.toFixed(3)}, spread=${spread?.toFixed(3) ?? "n/a"}, pool=${m.poolAddress}`,
        );
      }

      // 2. Build prompt
      const systemPrompt = `You are an AI trading agent for a prediction-market vault on DreamDEX.
You trade binary "Up or Down" event contracts on BTC and ETH prices. Each contract pays 1 USDC if correct, else 0.
You manage a vault funded by real LPs — trade conservatively and only when you have a genuine edge.
The vault's risk level is ${pot.strategy?.risk ?? "balanced"}.
Output ONLY valid JSON matching: { "side": "buy_up"|"buy_down"|"hold", "marketId": "...", "symbol": "...", "pool": "0x...", "sizeUsd": number, "maxPrice": number, "confidence": 0..1, "rationale": "..." }
- pool is the on-chain pool address (0x...) for the market.
- maxPrice is the MAX probability price you will pay for the chosen side (0..1).
- Choose "hold" if no market offers a clear edge. Never force a trade.`;

      const userPrompt = `Vault status: nav=${cash.toFixed(2)} USDC.
BTC spot: ${btcPrice ? `$${btcPrice}` : "unknown"}. ETH spot: ${ethPrice ? `$${ethPrice}` : "unknown"}.
Max single-trade size: ${(cash * caps.maxSinglePct).toFixed(2)} USDC.

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

      // 6. Execute via vault.trade()
      // Find the pool address from the candidate markets
      const market = candidates.find((m) => m.id === decision.marketId);
      if (!market || !market.poolAddress) {
        logger.warn(`Market ${decision.marketId} not found or no pool address`);
        return decision;
      }

      const exchange = getReadExchange();
      await exchange.loadMarkets(true);
      const onchain = await exchange.client.getMarketOnchain(decision.marketId as `0x${string}`);
      if (onchain.status !== 1) {
        logger.warn(`Market ${decision.marketId} is not trading (status ${onchain.status})`);
        return decision;
      }

      const params = await exchange.client.getBinaryBookParams(onchain.pool);
      const decimals = onchain.decimals ?? 6;

      // Map side to vault side enum: 0=BUY_YES, 1=SELL_YES, 2=BUY_NO, 3=SELL_NO
      const isBuy = decision.side.startsWith("buy");
      const isYes = decision.side.endsWith("up");
      const vaultSide: 0 | 1 | 2 | 3 = isBuy ? (isYes ? 0 : 2) : (isYes ? 1 : 3);

      // Price in the SDK is always YES terms
      const yesPrice = isYes ? decision.maxPrice : 1 - decision.maxPrice;
      const rawPrice = BigInt(Math.floor(yesPrice * 10 ** decimals));

      // Size in raw units (lot-snapped)
      const rawQty = BigInt(Math.floor(sizeUsd * 10 ** decimals));
      const lotSnapped = params.lotSize > 0n ? rawQty - (rawQty % params.lotSize) : rawQty;
      if (lotSnapped < params.minQuantity) {
        logger.info(`Size ${sizeUsd} is below minimum lot — skipping`);
        return decision;
      }

      // Expiry in nanoseconds (300s dead-man's switch)
      const poolExpiryNs = onchain.expiry * NS_PER_SEC;
      const nowNs = BigInt(Math.floor(Date.now() / 1000)) * NS_PER_SEC;
      const wantNs = nowNs + 300n * NS_PER_SEC;
      const expiryNs = wantNs < poolExpiryNs ? wantNs : poolExpiryNs;

      // Approve pool if needed
      await vaultApprovePool(vaultAddr, operatorKey, onchain.pool);

      const receipt = await vaultTrade(
        vaultAddr,
        operatorKey,
        onchain.pool,
        vaultSide,
        rawPrice,
        lotSnapped,
        expiryNs,
      );

      logger.info(`AI vault trade confirmed: tx=${receipt.transactionHash} side=${decision.side} size=${sizeUsd} (${decision.rationale})`);
      return decision;
    } catch (err) {
      logger.error(err, `AI agent cycle failed for pot ${potId}`);
      return null;
    }
  }
}
