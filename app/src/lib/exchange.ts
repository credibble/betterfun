import { SomniaMarkets, SOMNIA_TESTNET_ADDRESSES, SOMNIA_TESTNET_PRICE_FEED } from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import type { WalletClient } from "viem";

const indexerUrl = import.meta.env.VITE_SOMNIA_INDEXER_URL;
const wsRpcUrl = import.meta.env.VITE_SOMNIA_WS_RPC_URL;

export function createExchange(walletClient?: WalletClient): SomniaMarkets {
  return new SomniaMarkets({
    indexerUrl,
    chain: somniaShannon,
    wsRpcUrl,
    addresses: SOMNIA_TESTNET_ADDRESSES,
    priceFeed: SOMNIA_TESTNET_PRICE_FEED,
    walletClient,
  });
}
