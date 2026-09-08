import { privateKeyToAccount } from "viem/accounts";
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  defineChain,
  http,
  parseAbi,
  type Hex,
} from "viem";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { EVENT_VAULT_ABI, VAULT_FACTORY_ABI } from "./vault-abi.js";
import { VAULT_FACTORY_BYTECODE } from "./vault-factory-bytecode.js";
import { Pot } from "../pots/pot.entity.js";
import { broadcast } from "../realtime/ws-hub.js";

const somniaShannon = defineChain({
  id: 50312,
  name: "Somnia Shannon Testnet",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: {
    default: { http: [env.SOMNIA_RPC_URL] },
  },
});

export const publicClient = createPublicClient({
  chain: somniaShannon,
  transport: http(env.SOMNIA_RPC_URL),
});

export { EVENT_VAULT_ABI, VAULT_FACTORY_ABI } from "./vault-abi.js";

function getOperatorClient(privateKey: Hex) {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    chain: somniaShannon,
    account,
    transport: http(env.SOMNIA_RPC_URL),
  });
}

/* ─── Read helpers ────────────────────────────────────────────────── */

export async function readVaultNav(vault: Hex): Promise<bigint> {
  return publicClient.readContract({
    address: vault,
    abi: EVENT_VAULT_ABI,
    functionName: "nav",
  });
}

export async function readVaultPrice(vault: Hex): Promise<bigint> {
  return publicClient.readContract({
    address: vault,
    abi: EVENT_VAULT_ABI,
    functionName: "pricePerShare",
  });
}

export async function readVaultExposure(vault: Hex): Promise<bigint> {
  return publicClient.readContract({
    address: vault,
    abi: EVENT_VAULT_ABI,
    functionName: "exposure",
  });
}

export async function readVaultShares(vault: Hex, owner: Hex): Promise<bigint> {
  return publicClient.readContract({
    address: vault,
    abi: EVENT_VAULT_ABI,
    functionName: "balanceOf",
    args: [owner],
  });
}

export async function readVaultTotalSupply(vault: Hex): Promise<bigint> {
  return publicClient.readContract({
    address: vault,
    abi: EVENT_VAULT_ABI,
    functionName: "totalSupply",
  });
}

const OUTCOME_NFT_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [
      { name: "owner", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

/** Read the vault's balance of a specific outcome token (ERC-6909). */
export async function readOutcomeBalance(vault: Hex, tokenId: bigint): Promise<bigint> {
  const outcomeNft = env.OUTCOME_NFT_ADDRESS as Hex;
  return publicClient.readContract({
    address: outcomeNft,
    abi: OUTCOME_NFT_ABI,
    functionName: "balanceOf",
    args: [vault, tokenId],
  });
}

export async function readVaultPositionTotals(vault: Hex) {
  const [yes, no] = await publicClient.readContract({
    address: vault,
    abi: EVENT_VAULT_ABI,
    functionName: "positionTotals",
  });
  return { yes, no };
}

export async function readVaultState(vault: Hex) {
  const [
    nav,
    price,
    exposure,
    totalSupply,
    halted,
    operatorFees,
    protocolFees,
    operator,
    governance,
  ] = await publicClient.multicall({
    contracts: [
      { address: vault, abi: EVENT_VAULT_ABI, functionName: "nav" },
      { address: vault, abi: EVENT_VAULT_ABI, functionName: "pricePerShare" },
      { address: vault, abi: EVENT_VAULT_ABI, functionName: "exposure" },
      { address: vault, abi: EVENT_VAULT_ABI, functionName: "totalSupply" },
      { address: vault, abi: EVENT_VAULT_ABI, functionName: "halted" },
      { address: vault, abi: EVENT_VAULT_ABI, functionName: "operatorFees" },
      { address: vault, abi: EVENT_VAULT_ABI, functionName: "protocolFees" },
      { address: vault, abi: EVENT_VAULT_ABI, functionName: "operator" },
      { address: vault, abi: EVENT_VAULT_ABI, functionName: "governance" },
    ],
  });

  return {
    nav: nav.result as bigint,
    pricePerShare: price.result as bigint,
    exposure: exposure.result as bigint,
    totalSupply: totalSupply.result as bigint,
    halted: halted.result as boolean,
    operatorFees: operatorFees.result as bigint,
    protocolFees: protocolFees.result as bigint,
    operator: operator.result as Hex,
    governance: governance.result as Hex,
  };
}

/* ─── Write helpers ───────────────────────────────────────────────── */

export async function vaultDeposit(
  vault: Hex,
  privateKey: Hex,
  amount: bigint,
) {
  const client = getOperatorClient(privateKey);
  const hash = await client.writeContract({
    address: vault,
    abi: EVENT_VAULT_ABI,
    functionName: "enter",
    args: [amount],
  } as const);
  logger.info(`vault deposit: ${hash} (${amount} into ${vault})`);
  return publicClient.waitForTransactionReceipt({ hash });
}

export async function vaultWithdraw(
  vault: Hex,
  privateKey: Hex,
  shares: bigint,
) {
  const client = getOperatorClient(privateKey);
  const hash = await client.writeContract({
    address: vault,
    abi: EVENT_VAULT_ABI,
    functionName: "exit",
    args: [shares],
  } as const);
  logger.info(`vault withdraw: ${hash} (${shares} shares from ${vault})`);
  return publicClient.waitForTransactionReceipt({ hash });
}

export async function vaultTrade(
  vault: Hex,
  privateKey: Hex,
  pool: Hex,
  side: 0 | 1 | 2 | 3,
  tick: bigint,
  size: bigint,
  expiryNs: bigint,
) {
  const client = getOperatorClient(privateKey);
  const hash = await client.writeContract({
    address: vault,
    abi: EVENT_VAULT_ABI,
    functionName: "trade",
    args: [pool, side, tick, size, expiryNs, 0, 0],
  } as const);
  logger.info(`vault trade: ${hash} (side=${side}, size=${size})`);
  return publicClient.waitForTransactionReceipt({ hash });
}

export async function vaultRedeem(
  vault: Hex,
  privateKey: Hex,
  outcomeId: bigint,
  amount: bigint,
) {
  const client = getOperatorClient(privateKey);
  const hash = await client.writeContract({
    address: vault,
    abi: EVENT_VAULT_ABI,
    functionName: "redeem",
    args: [outcomeId, amount],
  } as const);
  logger.info(`vault redeem: ${hash} (outcome=${outcomeId}, amount=${amount})`);
  return publicClient.waitForTransactionReceipt({ hash });
}

export async function factoryDeploy(
  factory: Hex,
  trader: Hex,
  exposureLimit: bigint,
) {
  if (!factory || factory === "0x0000000000000000000000000000000000000000") {
    throw new Error(`Invalid factory address: ${factory} — check VAULT_FACTORY_ADDRESS in .env`);
  }
  const governanceKey = env.GOVERNANCE_PRIVATE_KEY as Hex;
  if (!governanceKey) throw new Error("GOVERNANCE_PRIVATE_KEY not set");
  const client = getOperatorClient(governanceKey);
  const hash = await client.writeContract({
    address: factory,
    abi: VAULT_FACTORY_ABI,
    functionName: "deploy",
    args: [trader, exposureLimit],
  } as const);
  logger.info(`factory deploy: ${hash} (trader=${trader})`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  // Extract vault address from VaultDeployed event logs
  let vaultAddr: Hex | null = null;
  for (const log of receipt.logs) {
    try {
      const parsed = decodeEventLog({
        abi: VAULT_FACTORY_ABI,
        data: log.data,
        topics: log.topics,
      });
      if (parsed.eventName === "VaultDeployed") {
        const args = parsed.args as unknown as { vault: Hex };
        vaultAddr = args.vault;
        break;
      }
    } catch {}
  }
  if (!vaultAddr) throw new Error("VaultDeployed event not found in factory deploy receipt");

  // deploy() already calls v.setGovernance(owner) inside the factory,
  // so governance is already the EOA — no transfer needed.

  return receipt;

  return receipt;
}

export async function deployFactory(): Promise<{ receipt: any; contractAddress: Hex }> {
  const governanceKey = env.GOVERNANCE_PRIVATE_KEY as Hex;
  if (!governanceKey) throw new Error("GOVERNANCE_PRIVATE_KEY not set");
  const client = getOperatorClient(governanceKey);

  const tusdc = env.TUSDC_TOKEN_ADDRESS as Hex;
  const outcomeNft = env.OUTCOME_NFT_ADDRESS as Hex;
  const settlement = env.SETTLEMENT_ADDRESS as Hex;

  if (!tusdc || !outcomeNft || !settlement) {
    throw new Error("TUSDC_TOKEN_ADDRESS, OUTCOME_NFT_ADDRESS, SETTLEMENT_ADDRESS must be set");
  }

  const governanceAddr = privateKeyToAccount(governanceKey).address;
  const hash = await client.deployContract({
    abi: VAULT_FACTORY_ABI,
    bytecode: VAULT_FACTORY_BYTECODE as `0x${string}`,
    args: [tusdc, outcomeNft, settlement, governanceAddr],
  } as const);

  logger.info(`factory deploy tx: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  logger.info(`New VaultFactory deployed at: ${receipt.contractAddress}`);
  return { receipt, contractAddress: receipt.contractAddress as Hex };
}

export async function vaultApprovePool(
  vault: Hex,
  privateKey: Hex,
  pool: Hex,
) {
  // Check if pool is already approved — skip the governance call if so.
  try {
    const alreadyApproved = await publicClient.readContract({
      address: vault,
      abi: EVENT_VAULT_ABI,
      functionName: "approved",
      args: [pool],
    });
    if (alreadyApproved) {
      logger.info(`Pool ${pool} already approved on vault ${vault}`);
      return;
    }
  } catch {
    // If we can't read, try the approve call anyway
  }

  // approvePool is gated by onlyGov — use the governance key.
  const governanceKey = (env.GOVERNANCE_PRIVATE_KEY ?? privateKey) as Hex;
  const client = getOperatorClient(governanceKey);
  const hash = await client.writeContract({
    address: vault,
    abi: EVENT_VAULT_ABI,
    functionName: "approvePool",
    args: [pool],
  } as const);
  logger.info(`vault approve pool: ${hash} (pool=${pool})`);
  return publicClient.waitForTransactionReceipt({ hash });
}

export async function factoryVaultCount(factory: Hex): Promise<bigint> {
  const result = await publicClient.readContract({
    address: factory,
    abi: VAULT_FACTORY_ABI,
    functionName: "vaultCount",
  });
  return BigInt(result as bigint);
}

/* ─── Vault → DB sync ─────────────────────────────────────────────── */

/**
 * Read vault state on-chain and update the pot's DB fields.
 * Called after every vault trade and periodically via sync job.
 */
export async function syncPotFromVault(
  vaultAddress: Hex,
  potId: string,
  dataSource: import("typeorm").DataSource,
): Promise<void> {
  const { nav, pricePerShare, totalSupply } =
    await readVaultState(vaultAddress);
  const { yes, no } = await readVaultPositionTotals(vaultAddress);

  const potRepo = dataSource.getRepository(Pot);
  const pot = await potRepo.findOne({ where: { id: potId } });
  if (!pot) return;

  const NAV_DECIMALS = 6;
  const navUsd = Number(nav) / 10 ** NAV_DECIMALS;
  const deployed = Number(yes < no ? yes : no) / 10 ** NAV_DECIMALS;
  const cash = navUsd - deployed;
  const sharesOutstanding = Number(totalSupply) / 1e18;
  const lpPrice = sharesOutstanding > 0 ? Number(pricePerShare) / 1e18 : 1;

  pot.nav = navUsd;
  pot.cash = cash;
  pot.deployed = deployed;
  pot.lpPrice = lpPrice;
  pot.sharesOutstanding = sharesOutstanding;
  await potRepo.save(pot);

  broadcast(`pot:${pot.id}`, {
    type: "pot:update",
    potId: pot.id,
    nav: navUsd,
    cash,
    deployed,
    lpPrice,
  });
}
