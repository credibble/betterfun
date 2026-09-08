import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { VAULT_ADDRESS, VAULT_ABI, TUSDC_TOKEN } from "./chains";

type VaultAddressParam = `0x${string}` | undefined;

// ─── Read hooks ──────────────────────────────────────────────────────────────

/** Vault NAV in raw collateral units (6dp). */
export function useVaultNav(vaultAddress?: VaultAddressParam) {
  return useReadContract({
    address: vaultAddress ?? VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "nav",
  });
}

/** Vault share price, 18dp. */
export function useVaultPrice(vaultAddress?: VaultAddressParam) {
  return useReadContract({
    address: vaultAddress ?? VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "pricePerShare",
  });
}

/** User's LP share balance. */
export function useVaultShares(account: `0x${string}` | undefined, vaultAddress?: VaultAddressParam) {
  return useReadContract({
    address: vaultAddress ?? VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "balanceOf",
    args: account ? [account] : undefined,
    query: { enabled: !!account },
  });
}

/** Total LP shares outstanding. */
export function useVaultTotalSupply(vaultAddress?: VaultAddressParam) {
  return useReadContract({
    address: vaultAddress ?? VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "totalSupply",
  });
}

/** Directional exposure (|YES - NO|). */
export function useVaultExposure(vaultAddress?: VaultAddressParam) {
  return useReadContract({
    address: vaultAddress ?? VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "exposure",
  });
}

/** YES and NO position totals across all pools. */
export function useVaultPositions(vaultAddress?: VaultAddressParam) {
  return useReadContract({
    address: vaultAddress ?? VAULT_ADDRESS,
    abi: VAULT_ABI,
    functionName: "positionTotals",
  });
}

// ─── Write hooks ─────────────────────────────────────────────────────────────

/**
 * Deposit tUSDC into the vault, receive LP shares.
 * Steps:
 *   1. Approve vault to spend tUSDC
 *   2. Call vault.enter(amount)
 */
export function useVaultDeposit(vaultAddress?: VaultAddressParam) {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const addr = vaultAddress ?? VAULT_ADDRESS;

  const deposit = async (amountUsd: number) => {
    const amount = parseUnits(amountUsd.toFixed(TUSDC_TOKEN.decimals), TUSDC_TOKEN.decimals);

    // Step 1: approve vault to pull tUSDC
    await writeContractAsync({
      address: TUSDC_TOKEN.address,
      abi: [
        {
          name: "approve",
          type: "function",
          stateMutability: "nonpayable",
          inputs: [
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" },
          ],
          outputs: [{ type: "bool" }],
        },
      ],
      functionName: "approve",
      args: [addr, amount],
    });

    // Step 2: enter the vault
    const enterHash = await writeContractAsync({
      address: addr,
      abi: VAULT_ABI,
      functionName: "enter",
      args: [amount],
    });

    return enterHash;
  };

  return { deposit, hash, isPending, receipt, error };
}

/**
 * Withdraw tUSDC from the vault by burning LP shares.
 * Calls vault.exit(shares).
 */
export function useVaultWithdraw(vaultAddress?: VaultAddressParam) {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const addr = vaultAddress ?? VAULT_ADDRESS;

  const withdraw = async (shares: bigint) => {
    await writeContractAsync({
      address: addr,
      abi: VAULT_ABI,
      functionName: "exit",
      args: [shares],
    });
  };

  return { withdraw, hash, isPending, receipt, error };
}

/** Format vault NAV for display. */
export function formatNav(nav: bigint | undefined): string {
  if (!nav) return "$0.00";
  return `$${Number(formatUnits(nav, TUSDC_TOKEN.decimals)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Format vault share price for display. */
export function formatSharePrice(price: bigint | undefined): string {
  if (!price) return "$1.00";
  return `$${Number(formatUnits(price, 18)).toFixed(4)}`;
}
