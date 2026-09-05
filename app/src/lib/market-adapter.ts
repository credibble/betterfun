import type { MarketSnapshot } from "@betterfun/shared";
import type { BinaryMarket, Market as SdkMarket } from "@somnia-chain/markets-sdk";
import { isBinaryMarket } from "@somnia-chain/markets-sdk";

const STATUS_MAP: Record<string, MarketSnapshot["status"]> = {
  Listed: "listed",
  Trading: "trading",
  Locked: "locked",
  Settling: "locked",
  Resolved: "resolved",
  Voided: "voided",
  Finalized: "resolved",
};

function deriveAsset(binary: BinaryMarket): "BTC" | "ETH" {
  const a = (binary.asset ?? "").toUpperCase();
  if (a === "BTC" || a === "ETH") return a;
  if (binary.question?.includes("BTC") || binary.question?.includes("Bitcoin")) return "BTC";
  if (binary.question?.includes("ETH") || binary.question?.includes("Ethereum")) return "ETH";
  return "BTC";
}

function deriveSymbol(binary: BinaryMarket): string {
  const asset = deriveAsset(binary);
  const ts = Number(binary.expiry) * 1000;
  const d = new Date(ts);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const mon = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
  const yr = d.getUTCFullYear();
  const strike = binary.strike && binary.strike !== "0" ? `-${binary.strike}` : "";
  return `${asset}${strike}-${day}${mon}${yr}/USDC`;
}

export function sdkMarketToApi(sdk: SdkMarket): MarketSnapshot {
  if (!isBinaryMarket(sdk)) {
    return {
      id: sdk.id,
      symbol: sdk.id,
      asset: "BTC" as const,
      intervalSec: 3600,
      expiry: new Date().toISOString(),
      upPrice: 0.5,
      downPrice: 0.5,
      volume: Number(sdk.cumulativeQuoteVolume ?? 0),
      status: "trading",
      poolAddress: sdk.poolAddress,
    };
  }

  const asset = deriveAsset(sdk);
  const lastPrice = sdk.lastPrice ? Number(sdk.lastPrice) : 0.5;
  const upPrice = Math.min(1, Math.max(0, lastPrice));
  const volume = sdk.cumulativeQuoteVolume ? Number(sdk.cumulativeQuoteVolume) : 0;
  const status = STATUS_MAP[sdk.status] ?? "trading";

  return {
    id: sdk.marketId ?? sdk.id,
    symbol: deriveSymbol(sdk),
    asset,
    intervalSec: 3600,
    expiry: sdk.expiry,
    upPrice,
    downPrice: 1 - upPrice,
    volume,
    status,
    poolAddress: sdk.poolAddress,
  };
}

export function sdkMarketsToApi(sdkMarkets: SdkMarket[]): MarketSnapshot[] {
  return sdkMarkets.map(sdkMarketToApi);
}
