import { useWriteContract, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import {
  PotVaultAbi,
  ERC20Abi,
  ADDRESSES,
  parseUsdc,
  formatUsdc,
} from "../contracts";

const VAULT_ADDRESS = ADDRESSES.POT_VAULT;
const TUSDC_ADDRESS = ADDRESSES.TUSDC;
const TUSDC_DECIMALS = 6;

// ── Helpers ───────────────────────────────────────────────────────────────────

export { parseUsdc, formatUsdc };

/** Format vault NAV for display (raw USDC or number). */
export function formatNav(nav: string | number | undefined): string {
  const val = typeof nav === "string" ? Number(nav) / 1e6 : (nav ?? 0);
  return `$${val.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Format vault share price for display. */
export function formatSharePrice(
  nav: string | number,
  totalShares: string | number,
): string {
  const n = typeof nav === "string" ? Number(nav) : nav;
  const s = typeof totalShares === "string" ? Number(totalShares) : totalShares;
  if (s === 0) return "$1.00";
  return `$${(n / s).toFixed(4)}`;
}

// ── Deposit ───────────────────────────────────────────────────────────────────

/**
 * Deposit tUSDC into a PotVault, receive LP shares.
 * Steps:
 *   1. Approve vault to spend tUSDC
 *   2. Call vault.enter(amount)
 */
export function useVaultDeposit(vaultAddress?: `0x${string}`) {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const addr = vaultAddress ?? VAULT_ADDRESS;

  const deposit = async (amountUsd: number) => {
    const amount = parseUnits(amountUsd.toFixed(TUSDC_DECIMALS), TUSDC_DECIMALS);

    await writeContractAsync({
      address: TUSDC_ADDRESS,
      abi: ERC20Abi,
      functionName: "approve",
      args: [addr, amount],
    });

    const enterHash = await writeContractAsync({
      address: addr,
      abi: PotVaultAbi,
      functionName: "enter",
      args: [amount],
    });

    return enterHash;
  };

  return { deposit, hash, isPending, receipt, error };
}

// ── Withdraw ──────────────────────────────────────────────────────────────────

/**
 * Withdraw tUSDC from a PotVault by burning LP shares.
 * Calls vault.exit(shares).
 */
export function useVaultWithdraw(vaultAddress?: `0x${string}`) {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const addr = vaultAddress ?? VAULT_ADDRESS;

  const withdraw = async (shares: bigint) => {
    await writeContractAsync({
      address: addr,
      abi: PotVaultAbi,
      functionName: "exit",
      args: [shares],
    });
  };

  return { withdraw, hash, isPending, receipt, error };
}

// ── Trade ─────────────────────────────────────────────────────────────────────

type Side = 0 | 1; // 0 = YES (up), 1 = NO (down)
type OrderKind = 0 | 1 | 2; // 0 = GTC, 1 = IOC, 2 = FOK
type SelfMatch = 0 | 1; // 0 = reject, 1 = allow

/**
 * Place a trade on a PotVault (binary event orderbook).
 * side: 0 = buy YES (up), 1 = buy NO (down)
 */
export function useVaultTrade(vaultAddress?: `0x${string}`) {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const addr = vaultAddress ?? VAULT_ADDRESS;

  const trade = async (params: {
    pool: `0x${string}`;
    side: Side;
    tick: bigint;
    size: bigint;
    expiryNs: bigint;
    orderKind?: OrderKind;
    selfMatch?: SelfMatch;
  }) => {
    const orderId = await writeContractAsync({
      address: addr,
      abi: PotVaultAbi,
      functionName: "trade",
      args: [
        params.pool,
        params.side,
        params.tick,
        params.size,
        params.expiryNs,
        params.orderKind ?? 0,
        params.selfMatch ?? 0,
      ],
    });
    return orderId;
  };

  return { trade, hash, isPending, receipt, error };
}

// ── Mint Set ──────────────────────────────────────────────────────────────────

export function useVaultMintSet(vaultAddress?: `0x${string}`) {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const addr = vaultAddress ?? VAULT_ADDRESS;

  const mintSet = async (pool: `0x${string}`, amount: bigint) => {
    await writeContractAsync({
      address: addr,
      abi: PotVaultAbi,
      functionName: "mintSet",
      args: [pool, amount],
    });
  };

  return { mintSet, hash, isPending, receipt, error };
}

// ── Burn Set ──────────────────────────────────────────────────────────────────

export function useVaultBurnSet(vaultAddress?: `0x${string}`) {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const addr = vaultAddress ?? VAULT_ADDRESS;

  const burnSet = async (pool: `0x${string}`, amount: bigint) => {
    await writeContractAsync({
      address: addr,
      abi: PotVaultAbi,
      functionName: "burnSet",
      args: [pool, amount],
    });
  };

  return { burnSet, hash, isPending, receipt, error };
}

// ── Redeem ────────────────────────────────────────────────────────────────────

export function useVaultRedeem(vaultAddress?: `0x${string}`) {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const addr = vaultAddress ?? VAULT_ADDRESS;

  const redeem = async (outcomeId: bigint, amount: bigint) => {
    await writeContractAsync({
      address: addr,
      abi: PotVaultAbi,
      functionName: "redeem",
      args: [outcomeId, amount],
    });
  };

  return { redeem, hash, isPending, receipt, error };
}

// ── Approve Pool ──────────────────────────────────────────────────────────────

export function useVaultApprovePool(vaultAddress?: `0x${string}`) {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const addr = vaultAddress ?? VAULT_ADDRESS;

  const approvePool = async (pool: `0x${string}`) => {
    await writeContractAsync({
      address: addr,
      abi: PotVaultAbi,
      functionName: "approvePool",
      args: [pool],
    });
  };

  return { approvePool, hash, isPending, receipt, error };
}

// ── Cancel Order ──────────────────────────────────────────────────────────────

export function useVaultCancelOrder(vaultAddress?: `0x${string}`) {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const addr = vaultAddress ?? VAULT_ADDRESS;

  const cancelOrder = async (pool: `0x${string}`, orderId: bigint) => {
    await writeContractAsync({
      address: addr,
      abi: PotVaultAbi,
      functionName: "cancelOrder",
      args: [pool, orderId],
    });
  };

  return { cancelOrder, hash, isPending, receipt, error };
}

// ── Claim Fees ────────────────────────────────────────────────────────────────

export function useVaultClaimTraderFees(vaultAddress?: `0x${string}`) {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const addr = vaultAddress ?? VAULT_ADDRESS;

  const claimTraderFees = async () => {
    await writeContractAsync({
      address: addr,
      abi: PotVaultAbi,
      functionName: "claimTraderFees",
    });
  };

  return { claimTraderFees, hash, isPending, receipt, error };
}

// ── TUSDC approve ─────────────────────────────────────────────────────────────

export function useApproveTusdc() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  const approve = async (spender: `0x${string}`, amountUsd: number) => {
    const amount = parseUnits(amountUsd.toFixed(TUSDC_DECIMALS), TUSDC_DECIMALS);
    await writeContractAsync({
      address: TUSDC_ADDRESS,
      abi: ERC20Abi,
      functionName: "approve",
      args: [spender, amount],
    });
  };

  return { approve, hash, isPending, receipt, error };
}

// ── Vault Read Hooks ──────────────────────────────────────────────────────────

/** Read a user's LP token balance in a PotVault. */
export function useVaultBalanceOf(vaultAddress: `0x${string}` | undefined, userAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: vaultAddress,
    abi: PotVaultAbi,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!vaultAddress && !!userAddress },
  });
}

/** Read the vault's claimable trader fees. */
export function useVaultTraderFees(vaultAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: vaultAddress,
    abi: PotVaultAbi,
    functionName: "traderFees",
    query: { enabled: !!vaultAddress },
  });
}

/** Check if a vault is halted. */
export function useVaultHalted(vaultAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: vaultAddress,
    abi: PotVaultAbi,
    functionName: "halted",
    query: { enabled: !!vaultAddress },
  });
}

/** Read the canonical price per share from the vault. */
export function useVaultPricePerShare(vaultAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: vaultAddress,
    abi: PotVaultAbi,
    functionName: "pricePerShare",
    query: { enabled: !!vaultAddress },
  });
}

/** Read total deposits in the vault. */
export function useVaultTotalDeposits(vaultAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: vaultAddress,
    abi: PotVaultAbi,
    functionName: "totalDeposits",
    query: { enabled: !!vaultAddress },
  });
}

/** Read current exposure in the vault. */
export function useVaultExposure(vaultAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: vaultAddress,
    abi: PotVaultAbi,
    functionName: "exposure",
    query: { enabled: !!vaultAddress },
  });
}

/** Read the vault's exposure limit. */
export function useVaultExposureLimit(vaultAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: vaultAddress,
    abi: PotVaultAbi,
    functionName: "exposureLimit",
    query: { enabled: !!vaultAddress },
  });
}

/** Check LP token allowance for a spender. */
export function useVaultAllowance(
  vaultAddress: `0x${string}` | undefined,
  owner: `0x${string}` | undefined,
  spender: `0x${string}` | undefined,
) {
  return useReadContract({
    address: vaultAddress,
    abi: PotVaultAbi,
    functionName: "allowance",
    args: owner && spender ? [owner, spender] : undefined,
    query: { enabled: !!vaultAddress && !!owner && !!spender },
  });
}
