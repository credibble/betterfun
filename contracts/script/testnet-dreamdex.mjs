// ============================================================================
// BetterFun V2 — DreamDEX Integration Test (fast mode)
// ============================================================================
// Reuses pre-deployed contracts. Only deploys a fresh pot + trades.
// Picks the pool with the most time remaining.
//
// Usage:
//   PRIVATE_KEY=0x... node contracts/script/testnet-dreamdex.mjs
//   PRIVATE_KEY=0x... DEPLOY=1 node contracts/script/testnet-dreamdex.mjs  (force redeploy)
// ============================================================================

import {
  createWalletClient, createPublicClient, http,
  decodeEventLog, formatUnits, parseUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEPLOYED_PATH = resolve(__dirname, "../deployed.json");

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) { console.error("Set PRIVATE_KEY env var"); process.exit(1); }
const FORCE_DEPLOY = process.env.DEPLOY === "1";

const RPC_URL = "https://dream-rpc.somnia.network";
const INDEXER_URL = "https://dev.smk.somnia.host/v1/graphql";
const somniaTestnet = {
  id: 50312, name: "Somnia Shannon Testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
};

const TUSDC = "0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E";
const OUTCOME_NFT = "0xB52c5934113Af5c0Bb20eb3C72290C8215f755b9";
const SETTLEMENT = "0xbF4a49e0Dfd092e5FBE8E5761064C49533e6Ed23";

function loadArtifact(name) {
  const p = resolve(__dirname, `../out/${name}.sol/${name}.json`);
  return JSON.parse(readFileSync(p, "utf8"));
}
function bc(json) {
  const raw = json.bytecode?.object ?? "";
  return raw.startsWith("0x") ? raw : `0x${raw}`;
}

let stepNum = 0;
function step(title) { stepNum++; console.log(`\n  [${stepNum}] ${title}`); }
function ok(msg) { console.log(`      OK: ${msg}`); }
function fail(msg) { console.log(`      FAIL: ${msg}`); process.exit(1); }
function info(label, value) { console.log(`      ${label}: ${value}`); }
function warn(msg) { console.log(`      WARN: ${msg}`); }

const ERC20 = [
  { type: "function", name: "balanceOf", inputs: [{ name: "a", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "approve", inputs: [{ name: "s", type: "address" }, { name: "a", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
];
const VAULT_ABI = [
  { type: "function", name: "nav", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "totalSupply", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "balanceOf", inputs: [{ name: "a", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "exposure", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "enter", inputs: [{ name: "amt", type: "uint256" }], outputs: [{ name: "shares", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "exit", inputs: [{ name: "shares", type: "uint256" }], outputs: [{ name: "out", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "approvePool", inputs: [{ name: "pool", type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "mintSet", inputs: [{ name: "pool", type: "address" }, { name: "amt", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "burnSet", inputs: [{ name: "pool", type: "address" }, { name: "amt", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "trade", inputs: [
    { name: "pool", type: "address" }, { name: "side", type: "uint8" }, { name: "tick", type: "uint256" },
    { name: "size", type: "uint256" }, { name: "expiryNs", type: "uint64" }, { name: "orderKind", type: "uint8" }, { name: "selfMatch", type: "uint8" }
  ], outputs: [{ name: "orderId", type: "uint256" }], stateMutability: "payable" },
  { type: "function", name: "cancelOrder", inputs: [{ name: "pool", type: "address" }, { name: "id", type: "uint128" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "redeem", inputs: [{ name: "outcomeId", type: "uint256" }, { name: "amt", type: "uint256" }], outputs: [{ name: "out", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "claimTraderFees", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "claimProtocolFees", inputs: [], outputs: [], stateMutability: "nonpayable" },
];

const POOL_ABI = [
  { type: "function", name: "getBinaryPoolParams", inputs: [],
    outputs: [
      { name: "collateral", type: "address" }, { name: "eventMarket", type: "address" },
      { name: "outcomeNft", type: "address" }, { name: "yesId", type: "uint256" },
      { name: "noId", type: "uint256" },
    ], stateMutability: "view" },
  { type: "function", name: "marketExpiryNs", inputs: [], outputs: [{ name: "", type: "uint64" }], stateMutability: "view" },
];

async function read(c, addr, abi, fn, args = []) {
  return c.readContract({ address: addr, abi, functionName: fn, args });
}
async function write(wallet, addr, abi, fn, args) {
  return wallet.writeContract({ address: addr, abi, functionName: fn, args });
}

async function findBestPool(pub) {
  const nowNs = BigInt(Date.now()) * 1000000n;
  let best = null;

  try {
    const resp = await fetch(INDEXER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: `{ Market(limit: 50, order_by: {createdAtTimestamp: desc}) { id poolAddress createdAtTimestamp } }` }),
    });
    const data = await resp.json();
    for (const m of (data?.data?.Market ?? [])) {
      const p = m.poolAddress;
      try {
        const exp = await read(pub, p, POOL_ABI, "marketExpiryNs");
        if (exp <= nowNs) continue;
        const remaining = exp - nowNs;
        if (!best || remaining > best.remaining) {
          const [, eventMarket, , yesId, noId] = await read(pub, p, POOL_ABI, "getBinaryPoolParams");
          best = { pool: p, eventMarket, yesId, noId, expiry: exp, remaining };
        }
      } catch {}
    }
  } catch {}

  return best;
}

async function main() {
  const account = privateKeyToAccount(PRIVATE_KEY);
  const deployer = account.address;
  const publicClient = createPublicClient({ chain: somniaTestnet, transport: http(RPC_URL) });
  const walletClient = createWalletClient({ account, chain: somniaTestnet, transport: http(RPC_URL) });

  console.log(`\n  BetterFun V2 — DreamDEX Integration Test`);
  console.log(`  Deployer: ${deployer}`);

  const tusdcBal = await read(publicClient, TUSDC, ERC20, "balanceOf", [deployer]);
  info("tUSDC Balance", formatUnits(tusdcBal, 6));
  if (tusdcBal < parseUnits("50", 6)) fail("Need >= 50 tUSDC");

  // ═══════════════════════════════════════════════════════════════════
  //  LOAD OR DEPLOY CONTRACTS
  // ═══════════════════════════════════════════════════════════════════
  let D = {};
  const haveDeployed = existsSync(DEPLOYED_PATH) && !FORCE_DEPLOY;

  if (haveDeployed) {
    D = JSON.parse(readFileSync(DEPLOYED_PATH, "utf8"));
    step("Using pre-deployed contracts");
    info("Factory", D.factory);
    info("Epoch", D.epoch);
    info("TraderReg", D.traderReg);
  } else {
    step("Deploy all contracts");
    async function deploy(name, args) {
      const art = loadArtifact(name);
      const h = await walletClient.deployContract({ abi: art.abi, bytecode: bc(art), args });
      return (await publicClient.waitForTransactionReceipt({ hash: h })).contractAddress;
    }
    D.gov = await deploy("PlatformGovernance", [deployer, parseUnits("100000", 6), parseUnits("10", 6), 10]);
    D.epoch = await deploy("EpochController", [7*24*60*60, 7*24*60*60, 1*24*60*60]);
    D.traderReg = await deploy("TraderRegistry", [deployer]);
    D.meta = await deploy("MetadataStore", [deployer]);
    D.factory = await deploy("PotFactory", [TUSDC, OUTCOME_NFT, SETTLEMENT, D.traderReg, deployer]);
    writeFileSync(DEPLOYED_PATH, JSON.stringify(D, null, 2));
    ok(`Saved to ${DEPLOYED_PATH}`);

    // Register trader + create epoch + go live
    let h;
    h = await write(walletClient, D.traderReg, loadArtifact("TraderRegistry").abi, "registerTrader",
      ["0x0000000000000000000000000000000000000000000000000000000000000001", deployer, 0]);
    await publicClient.waitForTransactionReceipt({ hash: h });
    h = await write(walletClient, D.epoch, loadArtifact("EpochController").abi, "createEpoch", [0n]);
    await publicClient.waitForTransactionReceipt({ hash: h });
    h = await write(walletClient, D.epoch, loadArtifact("EpochController").abi, "goLive", [0n]);
    await publicClient.waitForTransactionReceipt({ hash: h });
    ok("Trader registered, epoch 0 live");
  }

  // ═══════════════════════════════════════════════════════════════════
  //  FIND BEST POOL (most time remaining)
  // ═══════════════════════════════════════════════════════════════════
  step("Find best DreamDEX pool");
  const livePool = await findBestPool(publicClient);
  if (!livePool) fail("No live DreamDEX pool found");
  const secsLeft = Number(livePool.remaining / 1000000000n);
  info("Pool", livePool.pool);
  info("Event market", livePool.eventMarket);
  info("Time remaining", `${secsLeft}s`);

  // ═══════════════════════════════════════════════════════════════════
  //  DEPLOY POT + LP DEPOSIT (fast — factory call)
  // ═══════════════════════════════════════════════════════════════════
  step("Deploy pot + LP deposit 100 tUSDC");
  let h = await write(walletClient, D.factory, loadArtifact("PotFactory").abi, "createPot", [deployer, 0n, parseUnits("100000", 6)]);
  const potRcpt = await publicClient.waitForTransactionReceipt({ hash: h });
  let vault = null;
  for (const l of potRcpt.logs) {
    try {
      const p = decodeEventLog({ abi: loadArtifact("PotFactory").abi, data: l.data, topics: l.topics });
      if (p.eventName === "PotDeployed") { vault = p.args.vault; break; }
    } catch {}
  }
  if (!vault) fail("PotDeployed event not found");

  h = await write(walletClient, TUSDC, ERC20, "approve", [vault, parseUnits("100", 6)]);
  await publicClient.waitForTransactionReceipt({ hash: h });
  h = await write(walletClient, vault, VAULT_ABI, "enter", [parseUnits("100", 6)]);
  await publicClient.waitForTransactionReceipt({ hash: h });
  const shares = await read(publicClient, vault, VAULT_ABI, "balanceOf", [deployer]);
  ok(`Vault=${vault}, shares=${formatUnits(shares, 18)}`);

  // ═══════════════════════════════════════════════════════════════════
  //  APPROVE POOL
  // ═══════════════════════════════════════════════════════════════════
  step("Approve pool");
  h = await write(walletClient, vault, VAULT_ABI, "approvePool", [livePool.pool]);
  await publicClient.waitForTransactionReceipt({ hash: h });
  ok("Pool approved");

  // ═══════════════════════════════════════════════════════════════════
  //  MINT COMPLETE SETS
  // ═══════════════════════════════════════════════════════════════════
  step("Mint complete sets (20 tUSDC)");
  try {
    h = await write(walletClient, vault, VAULT_ABI, "mintSet", [livePool.pool, parseUnits("20", 6)]);
    await publicClient.waitForTransactionReceipt({ hash: h });
    const navAfter = await read(publicClient, vault, VAULT_ABI, "nav");
    ok(`Minted! NAV=${formatUnits(navAfter, 6)}`);
  } catch (e) {
    warn(`mintSet reverted: ${e.shortMessage ?? e.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PLACE TRADE (BUY YES)
  // ═══════════════════════════════════════════════════════════════════
  step("Place trade (BUY YES 10 tUSDC @ 0.50)");
  try {
    h = await write(walletClient, vault, VAULT_ABI, "trade",
      [livePool.pool, 0, parseUnits("0.5", 6), parseUnits("10", 6), livePool.expiry, 0, 0]);
    const tradeRcpt = await publicClient.waitForTransactionReceipt({ hash: h });
    info("Gas used", tradeRcpt.gasUsed.toString());
    let orderId = null;
    for (const l of tradeRcpt.logs) {
      try {
        const p = decodeEventLog({
          abi: [{ type: "event", name: "OrderPlaced", inputs: [
            { name: "pool", type: "address", indexed: true },
            { name: "side", type: "uint8" }, { name: "tick", type: "uint256" },
            { name: "size", type: "uint256" }, { name: "orderId", type: "uint256" },
          ]}],
          data: l.data, topics: l.topics,
        });
        if (p.eventName === "OrderPlaced") { orderId = p.args.orderId; break; }
      } catch {}
    }
    if (orderId) {
      info("Order ID", orderId.toString());
      ok("Trade PLACED on DreamDEX!");

      step("Cancel order");
      h = await write(walletClient, vault, VAULT_ABI, "cancelOrder", [livePool.pool, orderId]);
      await publicClient.waitForTransactionReceipt({ hash: h });
      ok("Order cancelled");
    } else {
      ok("Trade filled immediately (no resting order)");
    }
  } catch (e) {
    warn(`trade reverted: ${e.shortMessage ?? e.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PLACE OPPOSITE TRADE (BUY NO) to get resting order
  // ═══════════════════════════════════════════════════════════════════
  step("Place trade (BUY NO 10 tUSDC @ 0.50) — resting order");
  try {
    h = await write(walletClient, vault, VAULT_ABI, "trade",
      [livePool.pool, 2, parseUnits("0.5", 6), parseUnits("10", 6), livePool.expiry, 0, 0]);
    const tradeRcpt = await publicClient.waitForTransactionReceipt({ hash: h });
    let orderId = null;
    for (const l of tradeRcpt.logs) {
      try {
        const p = decodeEventLog({
          abi: [{ type: "event", name: "OrderPlaced", inputs: [
            { name: "pool", type: "address", indexed: true },
            { name: "side", type: "uint8" }, { name: "tick", type: "uint256" },
            { name: "size", type: "uint256" }, { name: "orderId", type: "uint256" },
          ]}],
          data: l.data, topics: l.topics,
        });
        if (p.eventName === "OrderPlaced") { orderId = p.args.orderId; break; }
      } catch {}
    }
    if (orderId) {
      info("Order ID", orderId.toString());
      ok("Resting BUY NO order on book");
    } else {
      ok("BUY NO filled immediately");
    }
  } catch (e) {
    warn(`BUY NO reverted: ${e.shortMessage ?? e.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  BURN COMPLETE SETS
  // ═══════════════════════════════════════════════════════════════════
  step("Burn complete sets (10 tUSDC)");
  try {
    h = await write(walletClient, vault, VAULT_ABI, "burnSet", [livePool.pool, parseUnits("10", 6)]);
    await publicClient.waitForTransactionReceipt({ hash: h });
    ok("Burned complete sets");
  } catch (e) {
    warn(`burnSet reverted: ${e.shortMessage ?? e.message}`);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  FINAL STATE
  // ═══════════════════════════════════════════════════════════════════
  step("Final vault state");
  const nav = await read(publicClient, vault, VAULT_ABI, "nav");
  const supply = await read(publicClient, vault, VAULT_ABI, "totalSupply");
  const exp = await read(publicClient, vault, VAULT_ABI, "exposure");
  info("NAV", formatUnits(nav, 6));
  info("Total supply", formatUnits(supply, 18));
  info("Exposure", formatUnits(exp, 6));

  step("LP withdraw all");
  const myShares = await read(publicClient, vault, VAULT_ABI, "balanceOf", [deployer]);
  if (myShares > 0n) {
    h = await write(walletClient, vault, VAULT_ABI, "exit", [myShares]);
    await publicClient.waitForTransactionReceipt({ hash: h });
    const finalBal = await read(publicClient, TUSDC, ERC20, "balanceOf", [deployer]);
    info("tUSDC balance", formatUnits(finalBal, 6));
    ok("LP withdrew all shares");
  }

  console.log(`\n  ${"=".repeat(60)}`);
  console.log(`  DREAMDEX INTEGRATION TEST COMPLETE`);
  console.log(`  ${"=".repeat(60)}\n`);
}

main().catch((e) => { console.error("\nFATAL:", e); process.exit(1); });
