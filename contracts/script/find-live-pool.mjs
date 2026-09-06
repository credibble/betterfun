// Quick script to find a live pool address
import { SomniaMarkets, SOMNIA_TESTNET_ADDRESSES, SOMNIA_TESTNET_PRICE_FEED } from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";

async function main() {
  const client = new SomniaMarkets({
    indexerUrl: "https://dev.smk.somnia.host/v1/graphql",
    chain: somniaShannon,
    wsRpcUrl: "wss://api.infra.testnet.somnia.network/ws",
    addresses: SOMNIA_TESTNET_ADDRESSES,
    priceFeed: SOMNIA_TESTNET_PRICE_FEED,
  });

  const markets = await client.loadMarkets(true);
  console.log("Loaded " + Object.keys(markets).length + " markets");

  for (const m of Object.values(markets)) {
    if (!m.active) continue;
    const info = m.info;
    if (!info || !info.marketId) continue;
    const asset = m.symbol?.split("-")[0];
    if (asset !== "BTC" && asset !== "ETH") continue;

    try {
      const onchain = await client.getMarketOnchain(info.marketId);
      console.log(m.symbol + " status=" + onchain.status + " pool=" + onchain.pool);
      if (onchain.status === 1) {
        console.log("\n=== FOUND LIVE MARKET ===");
        console.log("Market ID: " + info.marketId);
        console.log("Pool: " + onchain.pool);
        process.exit(0);
      }
    } catch (e) {
      console.log(m.symbol + " error: " + e.message);
    }
  }
  console.log("No live trading market found");
}

main().catch(console.error);
