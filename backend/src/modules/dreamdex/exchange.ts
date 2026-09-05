import { SomniaMarkets, SOMNIA_TESTNET_ADDRESSES, SOMNIA_TESTNET_PRICE_FEED } from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

let readExchange: SomniaMarkets | null = null;

/**
 * Get or create a read-only exchange (no private key) for market data reads.
 * This exchange watches markets, reads books, candles, prices — no trading.
 */
export function getReadExchange(): SomniaMarkets {
  if (!readExchange) {
    readExchange = new SomniaMarkets({
      indexerUrl: env.SOMNIA_INDEXER_URL,
      chain: somniaShannon,
      wsRpcUrl: env.SOMNIA_WS_RPC_URL,
      addresses: SOMNIA_TESTNET_ADDRESSES,
      priceFeed: SOMNIA_TESTNET_PRICE_FEED,
    });
    logger.info("DreamDEX read-only exchange created (testnet Shannon)");
  }
  return readExchange;
}

/**
 * Create a trading exchange bound to a specific pot signer key.
 * Each pot gets its own exchange instance with its own HD-derived key.
 */
export function createTradingExchange(privateKey: `0x${string}`): SomniaMarkets {
  return new SomniaMarkets({
    indexerUrl: env.SOMNIA_INDEXER_URL,
    chain: somniaShannon,
    wsRpcUrl: env.SOMNIA_WS_RPC_URL,
    addresses: SOMNIA_TESTNET_ADDRESSES,
    priceFeed: SOMNIA_TESTNET_PRICE_FEED,
    privateKey,
  });
}
