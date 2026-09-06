import { createPublicClient, createWalletClient, http, parseAbi, type Hex } from "viem";
import { somnia } from "viem/chains";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { EVENT_VAULT_ABI, VAULT_FACTORY_ABI } from "./vault-abi.js";

const publicClient = createPublicClient({
  chain: somnia,
  transport: http(env.SOMNIA_RPC_URL),
});

function getOperatorClient(privateKey: Hex) {
  return createWalletClient({
    chain: somnia,
    transport: http(env.SOMNIA_RPC_URL),
    account: privateKey,
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

export async function readVaultPositionTotals(vault: Hex) {
  const [yes, no] = await publicClient.readContract({
    address: vault,
    abi: EVENT_VAULT_ABI,
    functionName: "positionTotals",
  });
  return { yes, no };
}

export async function readVaultState(vault: Hex) {
  const [nav, price, exposure, totalSupply, halted, operatorFees, protocolFees, operator, governance] =
    await publicClient.multicall({
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
  });
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
  });
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
  });
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
  });
  logger.info(`vault redeem: ${hash} (outcome=${outcomeId}, amount=${amount})`);
  return publicClient.waitForTransactionReceipt({ hash });
}

export async function factoryDeploy(
  factory: Hex,
  privateKey: Hex,
  trader: Hex,
  exposureLimit: bigint,
) {
  const client = getOperatorClient(privateKey);
  const hash = await client.writeContract({
    address: factory,
    abi: VAULT_FACTORY_ABI,
    functionName: "deploy",
    args: [trader, exposureLimit],
  });
  logger.info(`factory deploy: ${hash} (trader=${trader})`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return receipt;
}

export async function factoryVaultCount(factory: Hex): Promise<bigint> {
  return publicClient.readContract({
    address: factory,
    abi: VAULT_FACTORY_ABI,
    functionName: "vaultCount",
  });
}
