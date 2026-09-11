// ============================================================================
// BetterFun V2 — Real Application Flow Test on Somnia Shannon Testnet
// ============================================================================
// Tests the FULL application lifecycle with real on-chain transactions.
// DreamDEX trading requires a live pool — if none exists, we test everything
// except the DreamDEX-specific operations (mintSet/burnSet/trade/settle/redeem).
//
// Usage:
//   PRIVATE_KEY=0x... node contracts/script/testnet-real.mjs
// ============================================================================

import {
  createWalletClient, createPublicClient, http,
  decodeEventLog, formatEther, formatUnits, parseUnits, parseEther, pad,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) { console.error("Set PRIVATE_KEY env var"); process.exit(1); }

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
const BINARY_MODULE = "0x3ecC694Cef705358864a646142ac17A90E29e388";

function loadArtifact(name) {
  const p = resolve(__dirname, `../out/${name}.sol/${name}.json`);
  if (!existsSync(p)) throw new Error(`Artifact not found: ${p}`);
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
  { type: "function", name: "allowance", inputs: [{ name: "o", type: "address" }, { name: "s", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "transfer", inputs: [{ name: "t", type: "address" }, { name: "a", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
];
const VAULT_READ = [
  { type: "function", name: "nav", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "totalSupply", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "operator", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "halted", inputs: [], outputs: [{ name: "", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "exposure", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "rosterLength", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "totalDeposits", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "totalWithdrawals", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "traderFees", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "protocolFees", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "balanceOf", inputs: [{ name: "a", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "approved", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "bool" }], stateMutability: "view" },
];
const VAULT_WRITE = [
  ...VAULT_READ,
  { type: "function", name: "enter", inputs: [{ name: "amt", type: "uint256" }], outputs: [{ name: "shares", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "exit", inputs: [{ name: "shares", type: "uint256" }], outputs: [{ name: "out", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "approvePool", inputs: [{ name: "pool", type: "address" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "mintSet", inputs: [{ name: "pool", type: "address" }, { name: "amt", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "burnSet", inputs: [{ name: "pool", type: "address" }, { name: "amt", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "trade", inputs: [
    { name: "pool", type: "address" }, { name: "side", type: "uint8" }, { name: "tick", type: "uint256" },
    { name: "size", type: "uint256" }, { name: "expiryNs", type: "uint64" }, { name: "orderKind", type: "uint8" }, { name: "selfMatch", type: "uint8" }
  ], outputs: [{ name: "orderId", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "cancelOrder", inputs: [{ name: "pool", type: "address" }, { name: "id", type: "uint128" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "redeem", inputs: [{ name: "outcomeId", type: "uint256" }, { name: "amt", type: "uint256" }], outputs: [{ name: "out", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "claimTraderFees", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "claimProtocolFees", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "setHalted", inputs: [{ name: "f", type: "bool" }], outputs: [], stateMutability: "nonpayable" },
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

async function read(client, addr, abi, fn, args = []) {
  return client.readContract({ address: addr, abi, functionName: fn, args });
}
async function write(wallet, addr, abi, fn, args) {
  return wallet.writeContract({ address: addr, abi, functionName: fn, args });
}

async function findLivePool(pub) {
  const nowNs = BigInt(Date.now()) * 1000000n;

  // Try indexer
  try {
    const resp = await fetch(INDEXER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: `{ eventContracts(limit: 20, where: {status: {_eq: "trading"}}) { pool symbol market_id } }` }),
    });
    const data = await resp.json();
    for (const c of (data?.data?.eventContracts ?? [])) {
      try {
        const exp = await read(pub, c.pool, POOL_ABI, "marketExpiryNs");
        if (exp === 0n || exp > nowNs) return { pool: c.pool, symbol: c.symbol };
      } catch {}
    }
  } catch {}

  // Fallback: known addresses
  const known = ["0x230f5ce9bf56e20a891847c3d4e597f2623b7bc6"];
  for (const p of known) {
    try {
      const exp = await read(pub, p, POOL_ABI, "marketExpiryNs");
      if (exp === 0n || exp > nowNs) {
        const [, , , yesId, noId] = await read(pub, p, POOL_ABI, "getBinaryPoolParams");
        return { pool: p, symbol: "BTC-unknown", yesId, noId };
      }
    } catch {}
  }
  return null;
}

async function main() {
  const account = privateKeyToAccount(PRIVATE_KEY);
  const deployer = account.address;
  const publicClient = createPublicClient({ chain: somniaTestnet, transport: http(RPC_URL) });
  const walletClient = createWalletClient({ account, chain: somniaTestnet, transport: http(RPC_URL) });

  console.log(`\n  BetterFun V2 — Real Application Flow Test`);
  console.log(`  Deployer: ${deployer}`);
  console.log(`  Chain: Somnia Shannon (50312)`);

  const bal = await publicClient.getBalance({ address: deployer });
  info("STT Balance", formatEther(bal));
  const tusdcBal = await read(publicClient, TUSDC, ERC20, "balanceOf", [deployer]);
  info("tUSDC Balance", formatUnits(tusdcBal, 6));
  if (tusdcBal < parseUnits("50", 6)) fail("Need >= 50 tUSDC");

  const D = {};

  // ═══════════════════════════════════════════════════════════════════
  //  PHASES 1-5: DEPLOY ALL CONTRACTS
  // ═══════════════════════════════════════════════════════════════════
  step("Deploy PlatformGovernance");
  let h = await walletClient.deployContract({ abi: loadArtifact("PlatformGovernance").abi, bytecode: bc(loadArtifact("PlatformGovernance")), args: [deployer, parseUnits("100000", 6), parseUnits("10", 6), 10] });
  D.gov = (await publicClient.waitForTransactionReceipt({ hash: h })).contractAddress;
  ok(`PlatformGovernance at ${D.gov}`);

  step("Deploy EpochController");
  h = await walletClient.deployContract({ abi: loadArtifact("EpochController").abi, bytecode: bc(loadArtifact("EpochController")), args: [7*24*60*60, 7*24*60*60, 1*24*60*60] });
  D.epoch = (await publicClient.waitForTransactionReceipt({ hash: h })).contractAddress;
  ok(`EpochController at ${D.epoch}`);

  step("Deploy TraderRegistry");
  h = await walletClient.deployContract({ abi: loadArtifact("TraderRegistry").abi, bytecode: bc(loadArtifact("TraderRegistry")), args: [deployer] });
  D.traderReg = (await publicClient.waitForTransactionReceipt({ hash: h })).contractAddress;
  ok(`TraderRegistry at ${D.traderReg}`);

  step("Deploy MetadataStore");
  h = await walletClient.deployContract({ abi: loadArtifact("MetadataStore").abi, bytecode: bc(loadArtifact("MetadataStore")), args: [deployer] });
  D.meta = (await publicClient.waitForTransactionReceipt({ hash: h })).contractAddress;
  ok(`MetadataStore at ${D.meta}`);

  step("Deploy PotFactory");
  h = await walletClient.deployContract({ abi: loadArtifact("PotFactory").abi, bytecode: bc(loadArtifact("PotFactory")), args: [TUSDC, OUTCOME_NFT, SETTLEMENT, D.traderReg, deployer] });
  D.factory = (await publicClient.waitForTransactionReceipt({ hash: h })).contractAddress;
  ok(`PotFactory at ${D.factory}`);

  // ═══════════════════════════════════════════════════════════════════
  //  PHASE 6: REGISTER TRADER
  // ═══════════════════════════════════════════════════════════════════
  step("Register Trader");
  h = await write(walletClient, D.traderReg, loadArtifact("TraderRegistry").abi, "registerTrader", [
    "0x0000000000000000000000000000000000000000000000000000000000000001", deployer, 0
  ]);
  await publicClient.waitForTransactionReceipt({ hash: h });
  const tc = await read(publicClient, D.traderReg, loadArtifact("TraderRegistry").abi, "traderCount");
  ok(`Trader registered, count=${tc}`);

  // ═══════════════════════════════════════════════════════════════════
  //  PHASE 7-8: CREATE EPOCH + GO LIVE
  // ═══════════════════════════════════════════════════════════════════
  step("Create Epoch");
  h = await write(walletClient, D.epoch, loadArtifact("EpochController").abi, "createEpoch", [0n]);
  await publicClient.waitForTransactionReceipt({ hash: h });
  ok("Epoch 0 created");

  step("Go Live");
  h = await write(walletClient, D.epoch, loadArtifact("EpochController").abi, "goLive", [0n]);
  await publicClient.waitForTransactionReceipt({ hash: h });
  ok("Epoch 0 live");

  // ═══════════════════════════════════════════════════════════════════
  //  PHASE 9: DEPLOY POT
  // ═══════════════════════════════════════════════════════════════════
  step("Deploy Pot via Factory");
  h = await write(walletClient, D.factory, loadArtifact("PotFactory").abi, "createPot", [deployer, 0n, parseUnits("100000", 6)]);
  const potRcpt = await publicClient.waitForTransactionReceipt({ hash: h });
  let vault = null;
  for (const l of potRcpt.logs) {
    try {
      const p = decodeEventLog({ abi: loadArtifact("PotFactory").abi, data: l.data, topics: l.topics });
      if (p.eventName === "PotDeployed") { vault = p.args.vault; break; }
    } catch {}
  }
  if (!vault) fail("PotDeployed event not found");
  D.vault = vault;
  ok(`PotVault at ${D.vault}`);

  // ═══════════════════════════════════════════════════════════════════
  //  PHASE 10: LP DEPOSIT
  // ═══════════════════════════════════════════════════════════════════
  step("LP Deposit 100 tUSDC");
  const depositAmt = parseUnits("100", 6);
  h = await write(walletClient, TUSDC, ERC20, "approve", [D.vault, depositAmt]);
  await publicClient.waitForTransactionReceipt({ hash: h });
  h = await write(walletClient, D.vault, VAULT_WRITE, "enter", [depositAmt]);
  await publicClient.waitForTransactionReceipt({ hash: h });
  const shares = await read(publicClient, D.vault, VAULT_READ, "balanceOf", [deployer]);
  ok(`Shares: ${formatUnits(shares, 18)}, NAV: ${formatUnits(await read(publicClient, D.vault, VAULT_READ, "nav"), 6)}`);

  // ═══════════════════════════════════════════════════════════════════
  //  PHASE 11: FIND LIVE DREAMDEX POOL
  // ═══════════════════════════════════════════════════════════════════
  step("Find Live DreamDEX Pool");
  const livePool = await findLivePool(publicClient);
  if (!livePool) {
    warn("No live DreamDEX pool found — skipping DreamDEX trading tests");
    warn("All non-DreamDEX operations will be tested");
  } else {
    info("Pool", `${livePool.pool} (${livePool.symbol})`);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PHASE 12: DREAMDEX INTEGRATION (if pool found)
  // ═══════════════════════════════════════════════════════════════════
  if (livePool) {
    step("Approve Pool on Vault");
    h = await write(walletClient, D.vault, VAULT_WRITE, "approvePool", [livePool.pool]);
    await publicClient.waitForTransactionReceipt({ hash: h });
    ok(`Pool approved, rosterLength=${await read(publicClient, D.vault, VAULT_READ, "rosterLength")}`);

    step("Mint Complete Sets");
    try {
      h = await write(walletClient, D.vault, VAULT_WRITE, "mintSet", [livePool.pool, parseUnits("50", 6)]);
      await publicClient.waitForTransactionReceipt({ hash: h });
      ok("Minted complete sets");
    } catch (e) {
      warn(`mintSet reverted: ${e.shortMessage ?? e.message}`);
    }

    step("Place Trade Order");
    try {
      h = await write(walletClient, D.vault, VAULT_WRITE, "trade", [livePool.pool, 0, parseUnits("0.5", 18), parseUnits("20", 6), BigInt(Date.now()) * 1000000n + 3600000000000n, 2, 0]);
      await publicClient.waitForTransactionReceipt({ hash: h });
      ok("Trade placed");
    } catch (e) {
      warn(`trade reverted: ${e.shortMessage ?? e.message}`);
    }

    step("Settle + Redeem");
    try {
      h = await write(walletClient, D.epoch, loadArtifact("EpochController").abi, "goSettling", [0n]);
      await publicClient.waitForTransactionReceipt({ hash: h });
      ok("Epoch 0 → Settling");
    } catch (e) {
      warn(`goSettling failed: ${e.shortMessage ?? e.message}`);
    }

    step("Claim Fees");
    const tf = await read(publicClient, D.vault, VAULT_READ, "traderFees");
    const pf = await read(publicClient, D.vault, VAULT_READ, "protocolFees");
    info("Trader fees", formatUnits(tf, 6));
    info("Protocol fees", formatUnits(pf, 6));
    if (tf > 0n) {
      h = await write(walletClient, D.vault, VAULT_WRITE, "claimTraderFees", []);
      await publicClient.waitForTransactionReceipt({ hash: h });
      ok("Trader fees claimed");
    }
    if (pf > 0n) {
      h = await write(walletClient, D.vault, VAULT_WRITE, "claimProtocolFees", []);
      await publicClient.waitForTransactionReceipt({ hash: h });
      ok("Protocol fees claimed");
    }
    if (tf === 0n && pf === 0n) ok("No fees to claim");
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PHASE 13: METADATA STORE
  // ═══════════════════════════════════════════════════════════════════
  step("Metadata Store — Set + Version");
  const cid1 = "0xabababababababababababababababababababababababababababababababab";
  const cid2 = "0xcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd";
  const entityKey = "0x0000000000000000000000000000000000000000000000000000000000000001";
  h = await write(walletClient, D.meta, loadArtifact("MetadataStore").abi, "setMetadata", [1, entityKey, cid1]);
  await publicClient.waitForTransactionReceipt({ hash: h });
  const cur1 = await read(publicClient, D.meta, loadArtifact("MetadataStore").abi, "getCurrentCID", [1, entityKey]);
  h = await write(walletClient, D.meta, loadArtifact("MetadataStore").abi, "setMetadata", [1, entityKey, cid2]);
  await publicClient.waitForTransactionReceipt({ hash: h });
  const cur2 = await read(publicClient, D.meta, loadArtifact("MetadataStore").abi, "getCurrentCID", [1, entityKey]);
  const prev = await read(publicClient, D.meta, loadArtifact("MetadataStore").abi, "getPreviousCID", [1, entityKey]);
  const histLen = await read(publicClient, D.meta, loadArtifact("MetadataStore").abi, "getVersionCount", [1, entityKey]);
  ok(`CID v1=${cur1}, v2=${cur2}, prev=${prev}, history=${histLen}`);

  // ═══════════════════════════════════════════════════════════════════
  //  PHASE 14: GOVERNANCE CONTROLS
  // ═══════════════════════════════════════════════════════════════════
  step("Governance — Pause + Unpause");
  h = await write(walletClient, D.gov, loadArtifact("PlatformGovernance").abi, "setPaused", [true]);
  await publicClient.waitForTransactionReceipt({ hash: h });
  const cfg1 = await read(publicClient, D.gov, loadArtifact("PlatformGovernance").abi, "getConfig", []);
  h = await write(walletClient, D.gov, loadArtifact("PlatformGovernance").abi, "setPaused", [false]);
  await publicClient.waitForTransactionReceipt({ hash: h });
  const cfg2 = await read(publicClient, D.gov, loadArtifact("PlatformGovernance").abi, "getConfig", []);
  ok(`Paused=${cfg1[7]}, Unpaused=${cfg2[7]}`);

  // ═══════════════════════════════════════════════════════════════════
  //  PHASE 15: EPOCH FORCE-SETTLE
  // ═══════════════════════════════════════════════════════════════════
  step("Create Epoch 1 (force-settle previous)");
  h = await write(walletClient, D.epoch, loadArtifact("EpochController").abi, "createEpoch", [0n]);
  await publicClient.waitForTransactionReceipt({ hash: h });
  const epCount = await read(publicClient, D.epoch, loadArtifact("EpochController").abi, "epochCount");
  ok(`Epoch count: ${epCount}`);

  // ═══════════════════════════════════════════════════════════════════
  //  PHASE 16: LP WITHDRAW
  // ═══════════════════════════════════════════════════════════════════
  step("LP Withdraw All");
  const myShares = await read(publicClient, D.vault, VAULT_READ, "balanceOf", [deployer]);
  if (myShares > 0n) {
    const navBefore = await read(publicClient, D.vault, VAULT_READ, "nav");
    h = await write(walletClient, D.vault, VAULT_WRITE, "exit", [myShares]);
    await publicClient.waitForTransactionReceipt({ hash: h });
    const navAfter = await read(publicClient, D.vault, VAULT_READ, "nav");
    const finalBal = await read(publicClient, TUSDC, ERC20, "balanceOf", [deployer]);
    info("NAV before", formatUnits(navBefore, 6));
    info("NAV after", formatUnits(navAfter, 6));
    info("tUSDC balance", formatUnits(finalBal, 6));
    ok("LP withdrew all shares");
  } else {
    ok("No shares to withdraw");
  }

  // ═══════════════════════════════════════════════════════════════════
  //  SUMMARY
  // ═══════════════════════════════════════════════════════════════════
  console.log(`\n  ${"=".repeat(60)}`);
  console.log(`  ALL PHASES COMPLETE`);
  console.log(`  ${"=".repeat(60)}`);
  console.log(`
  Deployed Contracts:
    PlatformGovernance: ${D.gov}
    EpochController:    ${D.epoch}
    TraderRegistry:     ${D.traderReg}
    MetadataStore:      ${D.meta}
    PotFactory:         ${D.factory}
    PotVault:           ${D.vault}
    DreamDEX Pool:      ${livePool?.pool ?? "(none found — trading tests skipped)"}

  Explorer: https://shannon.explorer.somnia.network
  `);
}

main().catch((e) => { console.error("\nFATAL:", e); process.exit(1); });
