// Check live DreamDEX pools from indexer
import { createPublicClient, http } from "viem";

const RPC = "https://dream-rpc.somnia.network";
const chain = { id: 50312, name: "Somnia", nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } };
const pub = createPublicClient({ chain, transport: http(RPC) });

const POOL_ABI = [
  { name: "getBinaryPoolParams", type: "function", inputs: [],
    outputs: [
      { name: "collateral", type: "address" }, { name: "eventMarket", type: "address" },
      { name: "outcomeNft", type: "address" }, { name: "yesId", type: "uint256" },
      { name: "noId", type: "uint256" },
    ], stateMutability: "view" },
  { name: "marketExpiryNs", type: "function", inputs: [], outputs: [{ name: "", type: "uint64" }], stateMutability: "view" },
];

async function main() {
  const pools = [
    "0x51b099a6043f4f21135408b3818487fb25653ba5",
    "0x9b97f870b4646b75f0ee6bbd4d0860644370c476",
    "0x0893219330b49d89c2813e2f5145be5a13c6c26e",
  ];

  const nowNs = BigInt(Date.now()) * 1000000n;

  for (const p of pools) {
    try {
      const [collateral, eventMarket, outcomeNft, yesId, noId] = await pub.readContract({
        address: p, abi: POOL_ABI, functionName: "getBinaryPoolParams",
      });
      const exp = await pub.readContract({ address: p, abi: POOL_ABI, functionName: "marketExpiryNs" });
      const expired = exp > 0n && nowNs > exp;
      console.log(`${p} | market: ${eventMarket} | expired: ${expired} | expiry: ${exp.toString()} | yesId: ${yesId.toString().substring(0, 10)}...`);
    } catch (e) {
      console.log(`${p} | ERROR: ${e.shortMessage || e.message}`);
    }
  }
}

main();
