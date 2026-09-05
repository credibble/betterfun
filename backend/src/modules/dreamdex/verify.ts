import { createPublicClient, http, parseAbiItem, formatUnits, parseEventLogs } from "viem";
import { SOMNIA_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { logger } from "../../lib/logger.js";

const COLLATERAL = SOMNIA_TESTNET_ADDRESSES.collateral as `0x${string}`;
const TRANSFER_EVENT = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");

const client = createPublicClient({ chain: somniaShannon as any, transport: http() });

/**
 * Verify that a confirmed tUSDC Transfer actually delivered `amountUsd` from
 * `fromAddress` to `toAddress` in the given transaction. Returns true only if
 * the receipt is final, the transfer matches, and the amount matches within
 * the collateral's precision.
 */
export async function verifyTusdcTransfer(input: {
  txHash: `0x${string}`;
  fromAddress?: `0x${string}`;
  toAddress: `0x${string}`;
  amountUsd: number;
  confirmations?: number;
}): Promise<{ ok: boolean; reason?: string; confirmations?: number; pending?: boolean }> {
  try {
    const receipt = await client.getTransactionReceipt({ hash: input.txHash });
    if (!receipt) return { ok: false, reason: "Transaction not found" };
    if (receipt.status === "reverted") return { ok: false, reason: "Transaction reverted" };

    // Confirm-window check
    const required = input.confirmations ?? 1;
    if (required > 1) {
      try {
        const head = await client.getBlockNumber();
        const conf = Number(head - receipt.blockNumber) + 1;
        if (conf < required) {
          return { ok: false, reason: "Pending", pending: true, confirmations: conf };
        }
      } catch {
        // block height unavailable — treat as confirmed
      }
    }

    const decimals = await client
      .readContract({
        address: COLLATERAL,
        abi: [{ name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] }] as const,
        functionName: "decimals",
      })
      .catch(() => 6);

    let matched = false;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== COLLATERAL.toLowerCase()) continue;
      try {
        const parsed = parseEventLogs({
          abi: [TRANSFER_EVENT],
          logs: [log],
        });
        if (parsed.length === 0) continue;
        const { from, to, value } = parsed[0]!.args;
        if (input.fromAddress && from?.toLowerCase() !== input.fromAddress.toLowerCase()) continue;
        if (to?.toLowerCase() !== input.toAddress.toLowerCase()) continue;

        const delivered = Number(formatUnits(value, Number(decimals)));
        // Allow small tolerance for rounding dust (0.1 USDC).
        if (Math.abs(delivered - input.amountUsd) < 0.1) {
          matched = true;
          break;
        }
        return { ok: false, reason: `Amount mismatch: delivered ${delivered}, expected ${input.amountUsd}` };
      } catch {
        // not a matching Transfer log
      }
    }

    if (!matched) return { ok: false, reason: "No matching tUSDC transfer to pot signer in tx" };
    return { ok: true };
  } catch (err) {
    logger.warn(err, `Deposit verification failed for tx ${input.txHash}`);
    return { ok: false, reason: "Could not verify transaction on chain" };
  }
}

/** A verification result that is pending (waiting for confirmations). */
export function isPendingResult(res: { ok: boolean; pending?: boolean }): boolean {
  return !res.ok && res.pending === true;
}