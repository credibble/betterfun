import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

const MIN_GAS = "0.005"; // STT — enough for a handful of writes

const publicClient = createPublicClient({ chain: somniaShannon as any, transport: http() });

/**
 * Ensure `to` has enough native STT to sign on-chain writes.
 * If the balance is below the threshold, top it up from GAS_FUNDER_PRIVATE_KEY.
 * Throws a descriptive error when the funder is unset or underfunded.
 */
export async function ensureGas(to: string): Promise<void> {
  try {
    const balance = await publicClient.getBalance({ address: to as `0x${string}` });
    if (balance >= parseEther(MIN_GAS)) return;

    const funderKey = env.GAS_FUNDER_PRIVATE_KEY as `0x${string}` | undefined;
    if (!funderKey) {
      throw new Error(
        `Address ${to} has no STT gas and GAS_FUNDER_PRIVATE_KEY is not configured — ` +
        `set it to an operator wallet funded with test STT.`,
      );
    }

    const account = privateKeyToAccount(funderKey);
    const funderBalance = await publicClient.getBalance({ address: account.address });
    if (funderBalance < parseEther("0.05")) {
      throw new Error(`Gas funder ${account.address} has insufficient STT (${funderBalance}).`);
    }

    const walletClient = createWalletClient({ account, chain: somniaShannon as any, transport: http() });
    const hash = await walletClient.sendTransaction({
      to: to as `0x${string}`,
      value: parseEther(env.POT_GAS_FUND_AMT),
      chain: somniaShannon as any,
    });
    logger.info(`Funded ${env.POT_GAS_FUND_AMT} STT gas to ${to} (${hash})`);
  } catch (err) {
    logger.warn(err, `ensureGas failed for ${to}`);
    throw err;
  }
}

/**
 * One-shot best-effort gas funding for a pot signer (does not throw).
 */
export async function fundGas(to: string): Promise<{ hash: string } | null> {
  try {
    await ensureGas(to);
    return { hash: "" };
  } catch {
    return null;
  }
}