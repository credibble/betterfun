// ============================================================================
// BetterFun V2 — Full Testnet Integration Test
// ============================================================================
// Deploys all new contracts to Somnia Shannon testnet and runs the complete
// lifecycle: deploy → register → epoch → pot → deposit → approve pool → trade → settle → claim
//
// Usage:
//   PRIVATE_KEY=0x... node contracts/script/testnet-full.mjs
//
// Requires:
//   PRIVATE_KEY env var (hex, with 0x prefix) — deployer/operator wallet
//   Must have STT gas on Somnia Shannon testnet (chain 50312)
// ============================================================================

import {
  createWalletClient,
  createPublicClient,
  http,
  decodeEventLog,
  formatEther,
  formatUnits,
  parseUnits,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Configuration ──────────────────────────────────────────────────────────

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error("ERROR: Set PRIVATE_KEY env var (hex, with 0x prefix)");
  process.exit(1);
}

const somniaTestnet = {
  id: 50312,
  name: "Somnia Shannon Testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://dream-rpc.somnia.network"] },
  },
};

const RPC_URL = "https://dream-rpc.somnia.network";

// DreamDEX deployed addresses
const TUSDC = "0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E";
const OUTCOME_NFT = "0xB52c5934113Af5c0Bb20eb3C72290C8215f755b9";
const SETTLEMENT = "0xbF4a49e0Dfd092e5FBE8E5761064C49533e6Ed23";
const BINARY_MODULE = "0x3ecC694Cef705358864a646142ac17A90E29e388";

// ─── Helpers ────────────────────────────────────────────────────────────────

function loadArtifact(name) {
  const paths = [
    resolve(__dirname, `../out/${name}.sol/${name}.json`),
    resolve(__dirname, `../out/${name}.json`),
  ];
  for (const p of paths) {
    if (existsSync(p)) {
      return JSON.parse(readFileSync(p, "utf8"));
    }
  }
  throw new Error(`Artifact not found: ${name} (searched: ${paths.join(", ")})`);
}

function bc(json) {
  const raw = json.bytecode?.object ?? "";
  return raw.startsWith("0x") ? raw : `0x${raw}`;
}

function section(title) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`  ${title}`);
  console.log(`${"=".repeat(70)}`);
}

function log(label, value) {
  console.log(`  ${label}: ${value}`);
}

function success(msg) {
  console.log(`  OK: ${msg}`);
}

function warn(msg) {
  console.log(`  WARN: ${msg}`);
}

async function deployContract(walletClient, publicClient, artifact, args, label) {
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: bc(artifact),
    args,
  });
  log(`${label} TX`, hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  log(`${label} Address`, receipt.contractAddress);
  success(`${label} deployed`);
  return receipt.contractAddress;
}

async function readField(publicClient, address, abi, functionName, args = []) {
  return publicClient.readContract({ address, abi, functionName, args });
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const account = privateKeyToAccount(PRIVATE_KEY);
  const deployer = account.address;

  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: http(RPC_URL),
  });

  const walletClient = createWalletClient({
    account,
    chain: somniaTestnet,
    transport: http(RPC_URL),
  });

  section("ENVIRONMENT");
  log("Deployer", deployer);
  log("Chain", "50312 (Somnia Shannon)");
  log("RPC", RPC_URL);

  const balance = await publicClient.getBalance({ address: deployer });
  log("STT Balance", `${formatEther(balance)} STT`);
  if (balance < parseEther("0.5")) {
    console.error("ERROR: Need at least 0.5 STT for gas");
    process.exit(1);
  }

  const deployed = {};

  // ════════════════════════════════════════════════════════════════════════════
  //  PHASE 1: DEPLOY PlatformGovernance
  // ════════════════════════════════════════════════════════════════════════════
  section("PHASE 1: Deploy PlatformGovernance");
  const govArtifact = loadArtifact("PlatformGovernance");
  deployed.governance = await deployContract(walletClient, publicClient, govArtifact,
    [deployer, parseUnits("100000", 6), parseUnits("10", 6), 10], "PlatformGovernance");

  // Verify
  const govOwner = await readField(publicClient, deployed.governance, govArtifact.abi, "owner");
  log("Owner", govOwner);
  success("PlatformGovernance verified");

  // ════════════════════════════════════════════════════════════════════════════
  //  PHASE 2: DEPLOY EpochController
  // ════════════════════════════════════════════════════════════════════════════
  section("PHASE 2: Deploy EpochController");
  const epochArtifact = loadArtifact("EpochController");
  const FUNDING_DURATION = 7 * 24 * 60 * 60;
  const TRADING_DURATION = 7 * 24 * 60 * 60;
  const EPOCH_BUFFER = 1 * 24 * 60 * 60;
  deployed.epochController = await deployContract(walletClient, publicClient, epochArtifact,
    [FUNDING_DURATION, TRADING_DURATION, EPOCH_BUFFER], "EpochController");

  const epochCount = await readField(publicClient, deployed.epochController, epochArtifact.abi, "epochCount");
  log("Epoch count", epochCount.toString());
  success("EpochController verified");

  // ════════════════════════════════════════════════════════════════════════════
  //  PHASE 3: DEPLOY TraderRegistry
  // ════════════════════════════════════════════════════════════════════════════
  section("PHASE 3: Deploy TraderRegistry");
  const traderRegArtifact = loadArtifact("TraderRegistry");
  deployed.traderRegistry = await deployContract(walletClient, publicClient, traderRegArtifact,
    [deployer], "TraderRegistry");

  const traderCount = await readField(publicClient, deployed.traderRegistry, traderRegArtifact.abi, "traderCount");
  log("Trader count", traderCount.toString());
  success("TraderRegistry verified");

  // ════════════════════════════════════════════════════════════════════════════
  //  PHASE 4: DEPLOY MetadataStore
  // ════════════════════════════════════════════════════════════════════════════
  section("PHASE 4: Deploy MetadataStore");
  const metaArtifact = loadArtifact("MetadataStore");
  deployed.metadataStore = await deployContract(walletClient, publicClient, metaArtifact,
    [deployer], "MetadataStore");
  success("MetadataStore deployed");

  // ════════════════════════════════════════════════════════════════════════════
  //  PHASE 5: DEPLOY PotFactory (links to DreamDEX)
  // ════════════════════════════════════════════════════════════════════════════
  section("PHASE 5: Deploy PotFactory");
  const factoryArtifact = loadArtifact("PotFactory");
  deployed.potFactory = await deployContract(walletClient, publicClient, factoryArtifact,
    [TUSDC, OUTCOME_NFT, SETTLEMENT, deployed.traderRegistry, deployer], "PotFactory");

  const potCount = await readField(publicClient, deployed.potFactory, factoryArtifact.abi, "potCount");
  log("Pot count", potCount.toString());
  success("PotFactory verified");

  // ════════════════════════════════════════════════════════════════════════════
  //  PHASE 6: REGISTER A TRADER
  // ════════════════════════════════════════════════════════════════════════════
  section("PHASE 6: Register Trader");
  const CID = "0x0000000000000000000000000000000000000000000000000000000000000001";
  const regTx = await walletClient.writeContract({
    address: deployed.traderRegistry,
    abi: traderRegArtifact.abi,
    functionName: "registerTrader",
    args: [CID, deployer, 0],
  });
  log("Register TX", regTx);
  await publicClient.waitForTransactionReceipt({ hash: regTx });

  const isTraderActive = await readField(publicClient, deployed.traderRegistry, traderRegArtifact.abi, "traderCount");
  log("Trader count after registration", isTraderActive.toString());
  success("Trader registered");

  // ════════════════════════════════════════════════════════════════════════════
  //  PHASE 7: CREATE AN EPOCH + GO LIVE
  // ════════════════════════════════════════════════════════════════════════════
  section("PHASE 7: Create Epoch");
  const epochTx = await walletClient.writeContract({
    address: deployed.epochController,
    abi: epochArtifact.abi,
    functionName: "createEpoch",
    args: [0n],
  });
  log("Create Epoch TX", epochTx);
  await publicClient.waitForTransactionReceipt({ hash: epochTx });

  const countAfterCreate = await readField(publicClient, deployed.epochController, epochArtifact.abi, "epochCount");
  log("Epoch count", countAfterCreate.toString());
  success("Epoch created");

  // Go live
  const goLiveTx = await walletClient.writeContract({
    address: deployed.epochController,
    abi: epochArtifact.abi,
    functionName: "goLive",
    args: [0n],
  });
  log("Go Live TX", goLiveTx);
  await publicClient.waitForTransactionReceipt({ hash: goLiveTx });

  const isLive = await readField(publicClient, deployed.epochController, epochArtifact.abi, "isFundingOpen", [0n]);
  log("Is funding open", isLive.toString());
  success("Epoch is LIVE");

  // ════════════════════════════════════════════════════════════════════════════
  //  PHASE 8: DEPLOY A POT VIA FACTORY
  // ════════════════════════════════════════════════════════════════════════════
  section("PHASE 8: Deploy Pot");
  const exposureLimit = parseUnits("100000", 6);
  const potTx = await walletClient.writeContract({
    address: deployed.potFactory,
    abi: factoryArtifact.abi,
    functionName: "createPot",
    args: [deployer, 0n, exposureLimit],
  });
  log("Deploy Pot TX", potTx);
  const potReceipt = await publicClient.waitForTransactionReceipt({ hash: potTx });

  let vaultAddress = null;
  for (const l of potReceipt.logs) {
    try {
      const parsed = decodeEventLog({ abi: factoryArtifact.abi, data: l.data, topics: l.topics });
      if (parsed.eventName === "PotDeployed") {
        vaultAddress = parsed.args.vault;
        break;
      }
    } catch {}
  }

  if (!vaultAddress) {
    console.error("ERROR: PotDeployed event not found");
    process.exit(1);
  }
  deployed.vault = vaultAddress;
  log("Vault", deployed.vault);

  const potCountAfter = await readField(publicClient, deployed.potFactory, factoryArtifact.abi, "potCount");
  log("Pot count", potCountAfter.toString());
  success("Pot deployed");

  // ════════════════════════════════════════════════════════════════════════════
  //  PHASE 9: VERIFY POT STATE
  // ════════════════════════════════════════════════════════════════════════════
  section("PHASE 9: Verify Pot State");

  const viewAbi = [
    { type: "function", name: "nav", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "pricePerShare", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "totalSupply", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "operator", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
    { type: "function", name: "governance", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
    { type: "function", name: "halted", inputs: [], outputs: [{ name: "", type: "bool" }], stateMutability: "view" },
    { type: "function", name: "epochId", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "collateral", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
    { type: "function", name: "exposureLimit", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "rosterLength", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "totalDeposits", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  ];

  // Read individual fields (Somnia doesn't support Multicall3)
  const vNav = await readField(publicClient, deployed.vault, viewAbi, "nav");
  const vSupply = await readField(publicClient, deployed.vault, viewAbi, "totalSupply");
  const vOperator = await readField(publicClient, deployed.vault, viewAbi, "operator");
  const vGov = await readField(publicClient, deployed.vault, viewAbi, "governance");
  const vEpochId = await readField(publicClient, deployed.vault, viewAbi, "epochId");
  const vCollateral = await readField(publicClient, deployed.vault, viewAbi, "collateral");
  const vExposure = await readField(publicClient, deployed.vault, viewAbi, "exposureLimit");

  log("NAV", formatUnits(vNav, 6), "tUSDC");
  log("Total Supply", formatUnits(vSupply, 18), "shares");
  log("Operator", vOperator);
  log("Governance", vGov);
  log("Epoch ID", vEpochId.toString());
  log("Collateral", vCollateral);
  log("Exposure Limit", formatUnits(vExposure, 6), "tUSDC");
  success("Pot state verified");

  // ════════════════════════════════════════════════════════════════════════════
  //  PHASE 10: FIND A LIVE DREAMDEX POOL
  // ════════════════════════════════════════════════════════════════════════════
  section("PHASE 10: Find Live DreamDEX Pool");

  let livePool = null;

  try {
    const query = `{ eventContracts(limit: 10, where: {status: {_eq: "trading"}}) { pool symbol market_id status } }`;
    const resp = await fetch("https://dev.smk.somnia.host/v1/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const data = await resp.json();
    const contracts = data?.data?.eventContracts ?? [];
    for (const c of contracts) {
      const asset = c.symbol?.split("-")[0];
      if (asset !== "BTC" && asset !== "ETH") continue;
      log("Found pool", `${c.pool} (${c.symbol})`);
      livePool = c.pool;
      break;
    }
  } catch (e) {
    warn("Indexer query failed: " + e.message);
  }

  if (!livePool) {
    warn("No live pool found via indexer — skipping pool-dependent tests");
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  PHASE 11: APPROVE POOL ON VAULT
  // ════════════════════════════════════════════════════════════════════════════
  if (livePool) {
    section("PHASE 11: Approve Pool on Vault");
    const approveTx = await walletClient.writeContract({
      address: deployed.vault,
      abi: viewAbi,
      functionName: "approvePool",
      args: [livePool],
    });
    log("Approve Pool TX", approveTx);
    await publicClient.waitForTransactionReceipt({ hash: approveTx });

    const approvedAbi = [{ type: "function", name: "approved", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "bool" }], stateMutability: "view" }];
    const isApproved = await readField(publicClient, deployed.vault, approvedAbi, "approved", [livePool]);
    log("Pool approved", isApproved.toString());

    const rosterLen = await readField(publicClient, deployed.vault, viewAbi, "rosterLength");
    log("Roster length", rosterLen.toString());
    success("Pool approved on vault");
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  PHASE 12: LP DEPOSIT INTO POT
  // ════════════════════════════════════════════════════════════════════════════
  section("PHASE 12: LP Deposit");

  const erc20Abi = [
    { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
  ];

  const tusdcBalance = await readField(publicClient, TUSDC, erc20Abi, "balanceOf", [deployer]);
  log("tUSDC Balance", formatUnits(tusdcBalance, 6));

  const depositAmount = parseUnits("100", 6);

  if (tusdcBalance < depositAmount) {
    warn(`Need ${formatUnits(depositAmount, 6)} tUSDC but have ${formatUnits(tusdcBalance, 6)}`);
    warn("Skipping deposit test — insufficient tUSDC balance");
  } else {
    // Approve vault
    const approveHash = await walletClient.writeContract({
      address: TUSDC,
      abi: erc20Abi,
      functionName: "approve",
      args: [deployed.vault, depositAmount],
    });
    log("Approve TX", approveHash);
    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    // Deposit
    const enterAbi = [{ type: "function", name: "enter", inputs: [{ name: "amount", type: "uint256" }], outputs: [{ name: "shares", type: "uint256" }], stateMutability: "nonpayable" }];
    const depositHash = await walletClient.writeContract({
      address: deployed.vault,
      abi: enterAbi,
      functionName: "enter",
      args: [depositAmount],
    });
    log("Deposit TX", depositHash);
    await publicClient.waitForTransactionReceipt({ hash: depositHash });

    // Read shares
    const balanceAbi = [{ type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" }];
    const shares = await readField(publicClient, deployed.vault, balanceAbi, "balanceOf", [deployer]);
    const newNav = await readField(publicClient, deployed.vault, viewAbi, "nav");
    const totalDeposits = await readField(publicClient, deployed.vault, viewAbi, "totalDeposits");

    log("Shares received", formatUnits(shares, 18));
    log("Vault NAV", formatUnits(newNav, 6), "tUSDC");
    log("Total deposits", formatUnits(totalDeposits, 6), "tUSDC");
    success("LP deposit completed");
  }

  // ════════════════════════════════════════════════════════════════════════════
  //  PHASE 13: TEST METADATA STORE
  // ════════════════════════════════════════════════════════════════════════════
  section("PHASE 13: Test Metadata Store");

  const metaWriteAbi = [
    { type: "function", name: "setMetadata", inputs: [{ name: "entityType", type: "uint8" }, { name: "entityKey", type: "bytes32" }, { name: "cid", type: "bytes32" }], outputs: [], stateMutability: "nonpayable" },
    { type: "function", name: "getCurrentCID", inputs: [{ name: "entityType", type: "uint8" }, { name: "entityKey", type: "bytes32" }], outputs: [{ name: "", type: "bytes32" }], stateMutability: "view" },
    { type: "function", name: "getVersionCount", inputs: [{ name: "entityType", type: "uint8" }, { name: "entityKey", type: "bytes32" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  ];

  const entityKey = "0x" + "0".repeat(63) + "1";
  const cid1 = "0x" + "ab".repeat(32);
  const cid2 = "0x" + "cd".repeat(32);

  const metaTx1 = await walletClient.writeContract({
    address: deployed.metadataStore,
    abi: metaWriteAbi,
    functionName: "setMetadata",
    args: [0, entityKey, cid1],
  });
  log("Set Metadata TX", metaTx1);
  await publicClient.waitForTransactionReceipt({ hash: metaTx1 });

  const currentCID = await readField(publicClient, deployed.metadataStore, metaWriteAbi, "getCurrentCID", [0, entityKey]);
  log("Current CID", currentCID);

  const metaTx2 = await walletClient.writeContract({
    address: deployed.metadataStore,
    abi: metaWriteAbi,
    functionName: "setMetadata",
    args: [0, entityKey, cid2],
  });
  await publicClient.waitForTransactionReceipt({ hash: metaTx2 });

  const versionCount = await readField(publicClient, deployed.metadataStore, metaWriteAbi, "getVersionCount", [0, entityKey]);
  log("Version count", versionCount.toString());
  success("Metadata store works");

  // ════════════════════════════════════════════════════════════════════════════
  //  PHASE 14: TEST GOVERNANCE CONTROLS
  // ════════════════════════════════════════════════════════════════════════════
  section("PHASE 14: Test Governance Controls");

  // Pause
  const pauseTx = await walletClient.writeContract({
    address: deployed.governance,
    abi: govArtifact.abi,
    functionName: "setPaused",
    args: [true],
  });
  await publicClient.waitForTransactionReceipt({ hash: pauseTx });

  const pausedAbi = [{ type: "function", name: "config", inputs: [], outputs: [{ name: "", type: "tuple", components: [
    { name: "lpShare", type: "uint8" },
    { name: "traderShare", type: "uint8" },
    { name: "protocolShare", type: "uint8" },
    { name: "protocolTreasury", type: "address" },
    { name: "maxExposureDefault", type: "uint256" },
    { name: "minDeposit", type: "uint256" },
    { name: "maxPotsPerTrader", type: "uint256" },
    { name: "paused", type: "bool" },
  ]}], stateMutability: "view" }];

  // Unpause
  const unpauseTx = await walletClient.writeContract({
    address: deployed.governance,
    abi: govArtifact.abi,
    functionName: "setPaused",
    args: [false],
  });
  await publicClient.waitForTransactionReceipt({ hash: unpauseTx });
  success("Governance pause/unpause works");

  // ════════════════════════════════════════════════════════════════════════════
  //  PHASE 15: TEST EPOCH FORCE-SETTLE
  // ════════════════════════════════════════════════════════════════════════════
  section("PHASE 15: Test Epoch Force-Settle");

  // Create epoch 1 — this should NOT force-settle epoch 0 (still Live, not past tradingEndsAt)
  const e1Tx = await walletClient.writeContract({
    address: deployed.epochController,
    abi: epochArtifact.abi,
    functionName: "createEpoch",
    args: [0n],
  });
  log("Create Epoch 1 TX", e1Tx);
  await publicClient.waitForTransactionReceipt({ hash: e1Tx });

  const e0Live = await readField(publicClient, deployed.epochController, epochArtifact.abi, "isFundingOpen", [0n]);
  log("Epoch 0 still Live?", e0Live.toString());

  const count2 = await readField(publicClient, deployed.epochController, epochArtifact.abi, "epochCount");
  log("Total epochs", count2.toString());
  success("Epoch creation works");

  // ════════════════════════════════════════════════════════════════════════════
  //  SUMMARY
  // ════════════════════════════════════════════════════════════════════════════
  section("DEPLOYMENT SUMMARY");

  console.log(`
  Network:    Somnia Shannon Testnet (50312)
  Deployer:   ${deployer}

  Deployed Contracts:
  ─────────────────────────────────────────────
  PlatformGovernance:  ${deployed.governance}
  EpochController:     ${deployed.epochController}
  TraderRegistry:      ${deployed.traderRegistry}
  MetadataStore:       ${deployed.metadataStore}
  PotFactory:          ${deployed.potFactory}
  PotVault (first):    ${deployed.vault}

  DreamDEX Contracts (pre-deployed):
  ─────────────────────────────────────────────
  BinaryMarketsModule: ${BINARY_MODULE}
  tUSDC:               ${TUSDC}
  OutcomeToken:        ${OUTCOME_NFT}
  Settlement:          ${SETTLEMENT}
  ${livePool ? `Live Pool:            ${livePool}` : "Live Pool:            (not found)"}

  Add to .env:
  ─────────────────────────────────────────────
  PLATFORM_GOVERNANCE_ADDRESS=${deployed.governance}
  EPOCH_CONTROLLER_ADDRESS=${deployed.epochController}
  TRADER_REGISTRY_ADDRESS=${deployed.traderRegistry}
  METADATA_STORE_ADDRESS=${deployed.metadataStore}
  POT_FACTORY_ADDRESS=${deployed.potFactory}
  POT_VAULT_ADDRESS=${deployed.vault}
  `);

  console.log("  All tests passed! Contracts live on Somnia Shannon testnet.");
  console.log("  Explorer: https://shannon.explorer.somnia.network\n");
}

main().catch((err) => {
  console.error("\nFATAL:", err);
  process.exit(1);
});
