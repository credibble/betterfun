import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { PotFactoryAbi, PotVaultAbi, ADDRESSES } from "../contracts";
import { getPots, getPot, type SubgraphPot } from "../subgraph";
import type { PotView, PotShareView } from "../types";

function sgPotToView(sg: SubgraphPot): PotView {
  return {
    id: sg.id,
    vault: sg.vault,
    epochId: sg.epoch,
    traderId: sg.trader,
    name: `Pot ${sg.id.slice(0, 8)}`,
    strategy: {
      title: "",
      note: "",
      risk: "balanced" as const,
      focus: [],
    },
    nav: Number(sg.nav) / 1e6,
    lpPrice:
      Number(sg.totalShares) > 0 ? Number(sg.nav) / Number(sg.totalShares) : 1,
    totalShares: Number(sg.totalShares),
    totalDeposits: Number(sg.totalDeposits) / 1e6,
    exposure: Number(sg.exposure),
    exposureLimit: Number(sg.exposureLimit),
    approvedPools: sg.approvedPools ?? [],
    status: "active" as const,
    createdAt: "",
  };
}

// ── Subgraph reads ──────────────────────────────────────────────────────────

export function usePots(params?: { epochId?: string; traderId?: string }) {
  const { data: sgPots = [], isLoading, error } = useQuery<SubgraphPot[]>({
    queryKey: ["subgraph", "pots", params?.epochId],
    queryFn: () => getPots(100, params?.epochId),
    staleTime: 10_000,
  });

  let pots = sgPots.map(sgPotToView);

  if (params?.traderId) {
    pots = pots.filter((p) => p.traderId === params.traderId);
  }

  return { data: pots, isLoading, error };
}

export function usePot(id: string) {
  const { data: sgPot, isLoading, error } = useQuery<SubgraphPot | null>({
    queryKey: ["subgraph", "pot", id],
    queryFn: () => getPot(id),
    enabled: !!id,
    staleTime: 10_000,
  });

  const data = sgPot ? sgPotToView(sgPot) : null;

  return { data, isLoading, error };
}

// ── Contract reads ────────────────────────────────────────────────────────────

export function usePotCount() {
  return useReadContract({
    address: ADDRESSES.POT_FACTORY,
    abi: PotFactoryAbi,
    functionName: "potCount",
  });
}

export function useIsVault(address: string | undefined) {
  return useReadContract({
    address: ADDRESSES.POT_FACTORY,
    abi: PotFactoryAbi,
    functionName: "isVault",
    args: address ? [address as `0x${string}`] : undefined,
    query: { enabled: !!address },
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Create a pot by calling PotFactory.createPot on-chain.
 */
export function useCreatePot() {
  const { writeContractAsync } = useWriteContract();
  const { address } = useAccount();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      epochId: string;
      exposureLimit?: string;
      strategy: {
        title: string;
        note: string;
        risk: "conservative" | "balanced" | "aggressive";
        focus: string[];
      };
    }) => {
      if (!address) throw new Error("Wallet not connected");
      const vault = await writeContractAsync({
        address: ADDRESSES.POT_FACTORY,
        abi: PotFactoryAbi,
        functionName: "createPot",
        args: [
          address,
          BigInt(input.epochId),
          input.exposureLimit ? BigInt(input.exposureLimit) : BigInt(10000) * 10n ** 6n,
        ],
      });

      return vault;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subgraph", "pots"] });
    },
  });
}

/**
 * Read the connected user's LP share balance in a pot's vault directly from
 * the PotVault contract (ERC20 balanceOf). Returns PotShareView[] with one
 * entry for the connected user (userId = wallet address).
 */
export function usePotShares(potId: string | undefined) {
  const { address } = useAccount();
  const vaultAddress = potId as `0x${string}` | undefined;
  const enabled = !!potId && !!address;

  const { data: sharesRaw, isLoading } = useReadContract({
    address: vaultAddress,
    abi: PotVaultAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled },
  });

  const data: PotShareView[] = address && sharesRaw != null
    ? [{
        id: potId ?? "",
        userId: address,
        shares: Number(formatUnits(sharesRaw as bigint, 18)),
        investedUsd: 0,
        claimableUsd: 0,
      }]
    : [];

  return { data, isLoading };
}
