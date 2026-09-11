// Debug trade directly on DreamDEX pool
import { createWalletClient, createPublicClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PK = readFileSync("C:/Users/devar/Documents/betterfun/backend/.env", "utf8")
  .split("\n").find(l => l.startsWith("GOVERNANCE_PRIVATE_KEY=")).split("=")[1];
const account = privateKeyToAccount(PK);
const chain = { id: 50312, name: "Somnia", nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 }, rpcUrls: { default: { http: ["https://dream-rpc.somnia.network"] } } };
const RPC = "https://dream-rpc.somnia.network";
const pub = createPublicClient({ chain, transport: http(RPC) });
const wal = createWalletClient({ account, chain, transport: http(RPC) });

const POOL = "0xf9a897be4b78d51e35bcee93938af2bc988dd317";
const TUSDC = "0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E";

const ERC20 = [
  { name: "balanceOf", type: "function", inputs: [{ name: "a", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { name: "approve", type: "function", inputs: [{ name: "s", type: "address" }, { name: "a", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
  { name: "allowance", type: "function", inputs: [{ name: "o", type: "address" }, { name: "s", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
];

const TRADE_ABI = [{
  name: "submitOrder", type: "function",
  inputs: [
    { name: "side", type: "uint8" },
    { name: "tick", type: "uint256" },
    { name: "size", type: "uint256" },
    { name: "expiryNs", type: "uint64" },
    { name: "orderKind", type: "uint8" },
    { name: "selfMatch", type: "uint8" },
    { name: "builder", type: "address" },
    { name: "builderBpsX1k", type: "uint96" },
    { name: "tag", type: "uint64" },
  ],
  outputs: [{ name: "", type: "uint256" }],
  stateMutability: "nonpayable",
}];

const POOL_ABI = [
  { name: "marketExpiryNs", type: "function", inputs: [], outputs: [{ name: "", type: "uint64" }], stateMutability: "view" },
  { name: "getBinaryPoolParams", type: "function", inputs: [],
    outputs: [
      { name: "collateral", type: "address" }, { name: "eventMarket", type: "address" },
      { name: "outcomeNft", type: "address" }, { name: "yesId", type: "uint256" },
      { name: "noId", type: "uint256" },
    ], stateMutability: "view" },
];

async function main() {
  const exp = await pub.readContract({ address: POOL, abi: POOL_ABI, functionName: "marketExpiryNs" });
  const nowNs = BigInt(Date.now()) * 1000000n;
  console.log("Pool expiry:", exp.toString(), "now:", nowNs.toString(), "remaining:", ((exp - nowNs) / 1000000000n).toString(), "s");

  // Approve collateral to pool
  const allowance = await pub.readContract({ address: TUSDC, abi: ERC20, functionName: "allowance", args: [account.address, POOL] });
  if (allowance < parseUnits("50", 6)) {
    const h = await wal.writeContract({ address: TUSDC, abi: ERC20, functionName: "approve", args: [POOL, parseUnits("100", 6)] });
    await pub.waitForTransactionReceipt({ hash: h });
    console.log("Approved 100 tUSDC to pool");
  }

  // Try different order kinds
  const sides = [
    { name: "BUY_YES_LIMIT", side: 0, kind: 0 },
    { name: "BUY_YES_MARKET", side: 0, kind: 2 },
    { name: "BUY_NO_LIMIT", side: 2, kind: 0 },
    { name: "BUY_NO_MARKET", side: 2, kind: 2 },
  ];

  for (const s of sides) {
    try {
      const h = await wal.writeContract({
        address: POOL, abi: TRADE_ABI, functionName: "submitOrder",
        args: [s.side, parseUnits("0.5", 18), parseUnits("5", 6), exp, s.kind, 0, "0x0000000000000000000000000000000000000000", 0, 0],
      });
      const rcpt = await pub.waitForTransactionReceipt({ hash: h });
      console.log(`${s.name} SUCCESS! gas=${rcpt.gasUsed.toString()} orderId in logs:`, rcpt.logs.some(l => l.topics[0]?.startsWith("0x")));
    } catch (e) {
      console.log(`${s.name} FAILED: ${e.shortMessage || e.message?.substring(0, 150)}`);
    }
  }
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
