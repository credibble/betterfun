import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { SOMNIA_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { ensureGas } from "./fund.js";
import { logger } from "../../lib/logger.js";

const COLLATERAL = SOMNIA_TESTNET_ADDRESSES.collateral as `0x${string}`;

const ERC20_ABI = [
  { name: "transfer", type: "function", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
] as const;

let cachedDecimals: number | null = null;

async function getDecimals(): Promise<number> {
  if (cachedDecimals != null) return cachedDecimals;
  try {
    const client = createPublicClient({ chain: somniaShannon as any, transport: http() });
    const decimals = await client.readContract({ address: COLLATERAL, abi: ERC20_ABI, functionName: "decimals" });
    cachedDecimals = Number(decimals);
  } catch {
    cachedDecimals = 6; // tUSDC default on testnet
  }
  return cachedDecimals;
}

/**
 * Transfer tUSDC from a pot signer (or any private key holder) to an address.
 * Returns the tx hash. Throws on revert/failure.
 */
export async function transferTusdc(input: {
  fromPrivateKey: `0x${string}`;
  to: `0x${string}`;
  amountUsd: number;
}): Promise<{ hash: string }> {
  if (input.amountUsd <= 0) throw new Error("Amount must be positive");

  // The sender needs native STT gas to broadcast the transfer.
  const sender = privateKeyToAccount(input.fromPrivateKey).address;
  await ensureGas(sender);

  const decimals = await getDecimals();
  const amount = BigInt(Math.round(input.amountUsd * 10 ** decimals));
  if (amount <= 0n) throw new Error("Amount below minimum unit");

  const account = privateKeyToAccount(input.fromPrivateKey);
  const walletClient = createWalletClient({
    account,
    chain: somniaShannon as any,
    transport: http(),
  });

  const hash = await walletClient.writeContract({
    address: COLLATERAL,
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [input.to, amount],
    chain: somniaShannon as any,
  });

  logger.info(`Transferred ${input.amountUsd} tUSDC to ${input.to} (${hash})`);
  return { hash };
}