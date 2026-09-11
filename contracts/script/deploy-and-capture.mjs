// ============================================================================
// BetterFun V2 — Deploy & Capture Block Numbers
// ============================================================================
// Deploys all contracts, captures deployment block numbers, and outputs:
//   1. contracts/deployed.json (addresses + blocks)
//   2. subgraph/subgraph.yaml (with correct startBlocks)
//
// Usage:
//   PRIVATE_KEY=0x... node contracts/script/deploy-and-capture.mjs
// =============================================================================

import {
  createWalletClient,
  createPublicClient,
  http,
  decodeEventLog,
  formatEther,
  parseUnits,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync, writeFileSync, existsSync } from "fs";
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

// DreamDEX pre-deployed addresses (DO NOT change)
const TUSDC = "0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E";
const OUTCOME_NFT = "0xB52c5934113Af5c0Bb20eb3C72290C8215f755b9";
const SETTLEMENT = "0xbF4a49e0Dfd092e5FBE8E5761064C49533e6Ed23";

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
  throw new Error(`Artifact not found: ${name}`);
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

// ─── Deploy with block capture ─────────────────────────────────────────────

async function deployContract(walletClient, publicClient, artifact, args, label) {
  const hash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: bc(artifact),
    args,
  });
  log(`${label} TX`, hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  log(`${label} Address`, receipt.contractAddress);
  log(`${label} Block`, receipt.blockNumber.toString());
  return { address: receipt.contractAddress, block: receipt.blockNumber };
}

// ─── Write subgraph.yaml with correct startBlocks ─────────────────────────

function writeSubgraphYaml(deployed) {
  const template = `specVersion: 0.0.5
features:
  - templateDataSources
schema:
  file: ./schema.graphql
templates:
  - kind: ethereum/contract
    name: PotVault
    network: somnia-testnet
    source:
      abi: PotVault
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      file: ./src/pot-vault.ts
      entities:
        - Pot
        - Deposit
        - Withdrawal
        - Trade
        - SetMint
        - SetBurn
        - FeeClaim
      abis:
        - name: PotVault
          file: ./abis/PotVault.json
      eventHandlers:
        - event: Deposit(indexed address,uint256,uint256)
          handler: handleDeposit
        - event: Withdraw(indexed address,uint256,uint256)
          handler: handleWithdraw
        - event: SetMinted(indexed address,uint256)
          handler: handleSetMinted
        - event: SetBurned(indexed address,uint256)
          handler: handleSetBurned
        - event: OrderPlaced(indexed address,uint8,uint256,uint256,uint256)
          handler: handleOrderPlaced
        - event: Redeemed(uint256,uint256,uint256)
          handler: handleRedeemed
        - event: FeesWithdrawn(indexed address,uint256,bool)
          handler: handleFeesWithdrawn
        - event: PoolApproved(indexed address)
          handler: handlePoolApproved
        - event: PoolRevoked(indexed address)
          handler: handlePoolRevoked

dataSources:
  - kind: ethereum/contract
    name: EpochController
    network: somnia-testnet
    source:
      address: "${deployed.epoch.address}"
      abi: EpochController
      startBlock: ${deployed.epoch.block}
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      file: ./src/epoch-controller.ts
      entities:
        - Epoch
        - Pot
      abis:
        - name: EpochController
          file: ./abis/EpochController.json
      eventHandlers:
        - event: EpochCreated(indexed uint256,uint256,uint256)
          handler: handleEpochCreated
        - event: EpochWentLive(indexed uint256)
          handler: handleEpochWentLive
        - event: EpochWentSettling(indexed uint256)
          handler: handleEpochWentSettling
        - event: EpochSettled(indexed uint256)
          handler: handleEpochSettled
        - event: PotAddedToEpoch(indexed uint256,indexed address)
          handler: handlePotAddedToEpoch

  - kind: ethereum/contract
    name: TraderRegistry
    network: somnia-testnet
    source:
      address: "${deployed.traderReg.address}"
      abi: TraderRegistry
      startBlock: ${deployed.traderReg.block}
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      file: ./src/trader-registry.ts
      entities:
        - Trader
      abis:
        - name: TraderRegistry
          file: ./abis/TraderRegistry.json
      eventHandlers:
        - event: TraderRegistered(indexed address,bytes32,address,uint8)
          handler: handleTraderRegistered
        - event: TraderUpdated(indexed address,bytes32)
          handler: handleTraderUpdated
        - event: TraderVerified(indexed address,bool)
          handler: handleTraderVerified
        - event: TraderDeactivated(indexed address)
          handler: handleTraderDeactivated

  - kind: ethereum/contract
    name: PotFactory
    network: somnia-testnet
    source:
      address: "${deployed.factory.address}"
      abi: PotFactory
      startBlock: ${deployed.factory.block}
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      file: ./src/pot-factory.ts
      entities:
        - Pot
        - Epoch
        - Trader
      abis:
        - name: PotFactory
          file: ./abis/PotFactory.json
      eventHandlers:
        - event: PotDeployed(indexed address,indexed uint256,indexed address,uint256,uint256)
          handler: handlePotDeployed

  - kind: ethereum/contract
    name: MetadataStore
    network: somnia-testnet
    source:
      address: "${deployed.meta.address}"
      abi: MetadataStore
      startBlock: ${deployed.meta.block}
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      file: ./src/metadata-store.ts
      entities:
        - MetadataUpdate
      abis:
        - name: MetadataStore
          file: ./abis/MetadataStore.json
      eventHandlers:
        - event: MetadataSet(indexed uint8,indexed bytes32,bytes32,uint256)
          handler: handleMetadataSet

  - kind: ethereum/contract
    name: PlatformGovernance
    network: somnia-testnet
    source:
      address: "${deployed.gov.address}"
      abi: PlatformGovernance
      startBlock: ${deployed.gov.block}
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      file: ./src/platform-governance.ts
      entities:
        - PlatformConfig
      abis:
        - name: PlatformGovernance
          file: ./abis/PlatformGovernance.json
      eventHandlers:
        - event: FeeSplitSet(uint8,uint8,uint8)
          handler: handleFeeSplitSet
        - event: TreasurySet(indexed address)
          handler: handleTreasurySet
        - event: MaxExposureSet(uint256)
          handler: handleMaxExposureSet
        - event: MinDepositSet(uint256)
          handler: handleMinDepositSet
        - event: MaxPotsPerTraderSet(uint256)
          handler: handleMaxPotsPerTraderSet
        - event: PausedSet(bool)
          handler: handlePausedSet
`;

  const subgraphPath = resolve(__dirname, "../../subgraph/subgraph.yaml");
  writeFileSync(subgraphPath, template, "utf8");
  log("subgraph.yaml", `written to ${subgraphPath}`);
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

  const balance = await publicClient.getBalance({ address: deployer });
  log("STT Balance", `${formatEther(balance)} STT`);
  if (balance < parseEther("0.5")) {
    console.error("ERROR: Need at least 0.5 STT for gas");
    process.exit(1);
  }

  const deployed = {};

  // ── Phase 1: PlatformGovernance ──────────────────────────────────────────
  section("PHASE 1: Deploy PlatformGovernance");
  const govArtifact = loadArtifact("PlatformGovernance");
  deployed.gov = await deployContract(walletClient, publicClient, govArtifact,
    [deployer, parseUnits("100000", 6), parseUnits("10", 6), 10], "PlatformGovernance");

  // ── Phase 2: EpochController ─────────────────────────────────────────────
  section("PHASE 2: Deploy EpochController");
  const epochArtifact = loadArtifact("EpochController");
  const FUNDING_DURATION = 7 * 24 * 60 * 60;
  const TRADING_DURATION = 7 * 24 * 60 * 60;
  const EPOCH_BUFFER = 1 * 24 * 60 * 60;
  deployed.epoch = await deployContract(walletClient, publicClient, epochArtifact,
    [FUNDING_DURATION, TRADING_DURATION, EPOCH_BUFFER], "EpochController");

  // ── Phase 3: TraderRegistry ──────────────────────────────────────────────
  section("PHASE 3: Deploy TraderRegistry");
  const traderRegArtifact = loadArtifact("TraderRegistry");
  deployed.traderReg = await deployContract(walletClient, publicClient, traderRegArtifact,
    [deployer], "TraderRegistry");

  // ── Phase 4: MetadataStore ───────────────────────────────────────────────
  section("PHASE 4: Deploy MetadataStore");
  const metaArtifact = loadArtifact("MetadataStore");
  deployed.meta = await deployContract(walletClient, publicClient, metaArtifact,
    [deployer], "MetadataStore");

  // ── Phase 5: PotFactory ──────────────────────────────────────────────────
  section("PHASE 5: Deploy PotFactory");
  const factoryArtifact = loadArtifact("PotFactory");
  deployed.factory = await deployContract(walletClient, publicClient, factoryArtifact,
    [TUSDC, OUTCOME_NFT, SETTLEMENT, deployed.traderReg.address, deployer], "PotFactory");

  // ── Write deployed.json ──────────────────────────────────────────────────
  section("WRITING deployed.json");
  const deployedJson = {
    gov: deployed.gov.address,
    govBlock: Number(deployed.gov.block),
    epoch: deployed.epoch.address,
    epochBlock: Number(deployed.epoch.block),
    traderReg: deployed.traderReg.address,
    traderRegBlock: Number(deployed.traderReg.block),
    meta: deployed.meta.address,
    metaBlock: Number(deployed.meta.block),
    factory: deployed.factory.address,
    factoryBlock: Number(deployed.factory.block),
  };

  const deployedPath = resolve(__dirname, "../deployed.json");
  writeFileSync(deployedPath, JSON.stringify(deployedJson, null, 2), "utf8");
  log("deployed.json", `written to ${deployedPath}`);

  // ── Write subgraph.yaml ──────────────────────────────────────────────────
  section("WRITING subgraph.yaml");
  writeSubgraphYaml(deployed);

  // ── Summary ──────────────────────────────────────────────────────────────
  section("DEPLOYMENT SUMMARY");
  console.log(`
  Network:    Somnia Shannon Testnet (50312)
  Deployer:   ${deployer}

  Deployed Contracts:
  ─────────────────────────────────────────────
  PlatformGovernance:  ${deployed.gov.address}   (block ${deployed.gov.block})
  EpochController:     ${deployed.epoch.address}   (block ${deployed.epoch.block})
  TraderRegistry:      ${deployed.traderReg.address}   (block ${deployed.traderReg.block})
  MetadataStore:       ${deployed.meta.address}   (block ${deployed.meta.block})
  PotFactory:          ${deployed.factory.address}   (block ${deployed.factory.block})

  DreamDEX (pre-deployed):
  ─────────────────────────────────────────────
  tUSDC:               ${TUSDC}
  OutcomeToken:        ${OUTCOME_NFT}
  Settlement:          ${SETTLEMENT}

  Next steps:
  ─────────────────────────────────────────────
  1. cd subgraph && npm run codegen && npm run build
  2. docker compose up -d graph-node
  3. Wait 30s for graph-node to start
  4. cd subgraph && npm run create-local && npm run deploy-local
  `);
}

main().catch((err) => {
  console.error("\nFATAL:", err);
  process.exit(1);
});
