import { useReadContract } from "wagmi";
import { PlatformGovernanceAbi, ADDRESSES } from "../contracts";
import { useQuery } from "@tanstack/react-query";
import { getPlatformConfig, type SubgraphPlatformConfig } from "../subgraph";

export interface PlatformConfig {
  lpShare: number;
  traderShare: number;
  protocolShare: number;
  treasury: string;
  maxExposure: number;
  minDeposit: number;
  maxPotsPerTrader: number;
  paused: boolean;
}

// ── Subgraph read ─────────────────────────────────────────────────────────────

export function usePlatformConfig() {
  return useQuery<PlatformConfig | null>({
    queryKey: ["subgraph", "platformConfig"],
    queryFn: async () => {
      const cfg = await getPlatformConfig();
      if (!cfg) return null;
      return {
        lpShare: Number(cfg.lpShare),
        traderShare: Number(cfg.traderShare),
        protocolShare: Number(cfg.protocolShare),
        treasury: cfg.treasury,
        maxExposure: Number(cfg.maxExposure),
        minDeposit: Number(cfg.minDeposit) / 1e6,
        maxPotsPerTrader: Number(cfg.maxPotsPerTrader),
        paused: cfg.paused,
      };
    },
    staleTime: 60_000,
  });
}

// ── Contract reads ────────────────────────────────────────────────────────────

export function useGovernanceConfig() {
  return useReadContract({
    address: ADDRESSES.PLATFORM_GOVERNANCE,
    abi: PlatformGovernanceAbi,
    functionName: "getConfig",
  });
}

/**
 * Pre-validate a deposit amount against the platform's minDeposit rule.
 * Use this before calling Vault.enter() to give users a friendly error.
 */
export function useIsDepositValid(amount: bigint | undefined) {
  return useReadContract({
    address: ADDRESSES.PLATFORM_GOVERNANCE,
    abi: PlatformGovernanceAbi,
    functionName: "isDepositValid",
    args: amount !== undefined ? [amount] : undefined,
    query: { enabled: amount !== undefined },
  });
}

/**
 * Check if a vault operator is authorized.
 */
export function useIsOperator(address: `0x${string}` | undefined) {
  return useReadContract({
    address: ADDRESSES.PLATFORM_GOVERNANCE,
    abi: PlatformGovernanceAbi,
    functionName: "isOperator",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}
