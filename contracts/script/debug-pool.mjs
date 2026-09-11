// Debug DreamDEX pool interaction
import { createPublicClient, createWalletClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "fs";

const PK = readFileSync("C:/Users/devar/Documents/betterfun/backend/.env", "utf8")
  .split("\n").find(l => l.startsWith("GOVERNANCE_PRIVATE_KEY=")).split("=")[1];
const account = privateKeyToAccount(PK);
const chain = { id: 50312, name: "Somnia", nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 }, rpcUrls: { default: { http: ["https://dream-rpc.somnia.network"] } } };
const RPC = "https://dream-rpc.somnia.network";
const pub = createPublicClient({ chain, transport: http(RPC) });
const wal = createWalletClient({ account, chain, transport: http(RPC) });

const POOL = "0x230f5ce9bf56e20a891847c3d4e597f2623b7bc6";
const COLLATERAL = "0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E";
const OUTCOME = "0xB52c5934113Af5c0Bb20eb3C72290C8215f755b9";

const ERC20 = [
  { name: "balanceOf", type: "function", inputs: [{ name: "a", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { name: "approve", type: "function", inputs: [{ name: "s", type: "address" }, { name: "a", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
  { name: "allowance", type: "function", inputs: [{ name: "o", type: "address" }, { name: "s", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
];

const POOL_ABI = [
  { name: "frozen", type: "function", inputs: [], outputs: [{ name: "", type: "bool" }], stateMutability: "view" },
  { name: "marketExpiryNs", type: "function", inputs: [], outputs: [{ name: "", type: "uint64" }], stateMutability: "view" },
  { name: "owner", type: "function", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { name: "getBinaryPoolParams", type: "function", inputs: [],
    outputs: [
      { name: "collateral", type: "address" }, { name: "eventMarket", type: "address" },
      { name: "outcomeNft", type: "address" }, { name: "yesId", type: "uint256" },
      { name: "noId", type: "uint256" },
    ], stateMutability: "view" },
  { name: "settle", type: "function", inputs: [{ name: "winner", type: "uint8" }], outputs: [], stateMutability: "nonpayable" },
  { name: "settleWithClose", type: "function", inputs: [{ name: "winner", type: "uint8" }], outputs: [], stateMutability: "nonpayable" },
];

const MINT_ABI = [{ name: "mintSet", type: "function", inputs: [{ name: "owner", type: "address" }, { name: "recipient", type: "address" }, { name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" }];
const TRADE_ABI = [{ name: "submitOrder", type: "function", inputs: [
  { name: "side", type: "uint8" }, { name: "tick", type: "uint256" }, { name: "size", type: "uint256" },
  { name: "expiryNs", type: "uint64" }, { name: "orderKind", type: "uint8" }, { name: "selfMatch", type: "uint8" },
  { name: "builder", type: "address" }, { name: "builderBpsX1k", type: "uint96" }, { name: "tag", type: "uint64" },
], outputs: [{ name: "", type: "uint256" }], stateMutability: "nonpayable" }];

async function read(c, addr, abi, fn, args = []) {
  return c.readContract({ address: addr, abi, functionName: fn, args });
}
async function write(c, addr, abi, fn, args) {
  return c.writeContract({ address: addr, abi, functionName: fn, args });
}

async function main() {
  console.log("=== Debug DreamDEX Pool ===");
  console.log("EOA:", account.address);

  // Pool params
  const [collateral, eventMarket, outcomeNft, yesId, noId] = await read(pub, POOL, POOL_ABI, "getBinaryPoolParams");
  console.log("Pool collateral:", collateral);
  console.log("Pool eventMarket:", eventMarket);
  console.log("Pool outcomeNft:", outcomeNft);
  console.log("Pool yesId:", yesId.toString());
  console.log("Pool noId:", noId.toString());

  // Pool state — skip frozen check (may not exist on this pool)
  try {
    const frozen = await read(pub, POOL, POOL_ABI, "frozen");
    console.log("Pool frozen:", frozen);
  } catch (e) {
    console.log("Pool frozen: unknown (function may not exist)");
  }

  try {
    const expiry = await read(pub, POOL, POOL_ABI, "marketExpiryNs");
    console.log("Market expiry ns:", expiry.toString());
    const nowNs = BigInt(Date.now()) * 1000000n;
    console.log("Now ns:", nowNs.toString());
    console.log("Expired:", expiry > 0n && nowNs > expiry);
  } catch (e) {
    console.log("expiry read failed:", e.shortMessage || e.message);
  }

  try {
    const owner = await read(pub, POOL, POOL_ABI, "owner");
    console.log("Pool owner:", owner);
  } catch (e) {
    console.log("owner read failed:", e.shortMessage || e.message);
  }

  // Approve collateral to pool
  console.log("\n--- Approve collateral to pool ---");
  const allowance = await read(pub, COLLATERAL, ERC20, "allowance", [account.address, POOL]);
  console.log("Current allowance:", allowance.toString());
  if (allowance < parseUnits("20", 6)) {
    const h = await write(wal, COLLATERAL, ERC20, "approve", [POOL, parseUnits("100", 6)]);
    await pub.waitForTransactionReceipt({ hash: h });
    console.log("Approved 100 tUSDC to pool");
  }

  // Try mintSet directly from EOA
  console.log("\n--- Try mintSet from EOA ---");
  try {
    const h = await write(wal, POOL, MINT_ABI, "mintSet", [account.address, account.address, parseUnits("10", 6)]);
    const rcpt = await pub.waitForTransactionReceipt({ hash: h });
    console.log("mintSet SUCCESS! tx:", h);
    console.log("Gas used:", rcpt.gasUsed.toString());
  } catch (e) {
    console.log("mintSet FAILED:", e.shortMessage || e.message);
  }

  // Try trade (BUY_YES at 0.5e18)
  console.log("\n--- Try trade from EOA ---");
  try {
    const h = await write(wal, POOL, TRADE_ABI, "submitOrder", [0, parseUnits("0.5", 18), parseUnits("10", 6), BigInt(Date.now()) * 1000000n + 3600000000000n, 2, 0, "0x0000000000000000000000000000000000000000", 0, 0]);
    const rcpt = await pub.waitForTransactionReceipt({ hash: h });
    console.log("trade SUCCESS! tx:", h);
    console.log("Gas used:", rcpt.gasUsed.toString());
    for (const l of rcpt.logs) {
      console.log("  Log topic0:", l.topics[0]);
    }
  } catch (e) {
    console.log("trade FAILED:", e.shortMessage || e.message);
  }
}

main().catch(e => { console.error("FATAL:", e); process.exit(1); });
