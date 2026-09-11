import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { PotFactoryAbi, ADDRESSES } from "../contracts";
import { getPots, getPot, type SubgraphPot } from "../subgraph";
import { api } from "../api-client";
import type { PotView } from "../types";

function sgPotToView(sg: SubgraphPot, backend?: Record<string, unknown>): PotView {
  const be = backend ?? {};
  return {
    id: sg.id,
    vault: sg.vault,
    epochId: sg.epoch,
    traderId: sg.trader,
    name: (be.name as string) ?? `Pot ${sg.id.slice(0, 8)}`,
    strategy: (be.strategy as PotView["strategy"]) ?? {
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
    createdAt: (be.createdAt as string) ?? "",
  };
}

// ── Subgraph + backend reads ──────────────────────────────────────────────────

export function usePots(params?: { epochId?: string; traderId?: string }) {
  const { data: sgPots = [], isLoading, error } = useQuery<SubgraphPot[]>({
    queryKey: ["subgraph", "pots", params?.epochId],
    queryFn: () => getPots(100, params?.epochId),
    staleTime: 10_000,
  });

  const { data: backendPots = [] } = useQuery<Record<string, unknown>[]>({
    queryKey: ["backend-pots"],
    queryFn: () => api<Record<string, unknown>[]>("/pots"),
    staleTime: 30_000,
    retry: false,
  });

  const backendMap = new Map(backendPots.map((p) => [p.id, p]));

  let pots = sgPots.map((sg) => sgPotToView(sg, backendMap.get(sg.id) as Record<string, unknown> | undefined));

  if (params?.traderId) {
    pots = pots.filter((p) => p.traderId === params.traderId);
  }

  return { data: pots, isLoading, error };
}

export function usePot(id: string) {
  const { data: sgPot, isLoading: sgLoading, error: sgError } = useQuery<SubgraphPot | null>({
    queryKey: ["subgraph", "pot", id],
    queryFn: async () => {
      const { getPot: fetchPot } = await import("../subgraph");
      return fetchPot(id);
    },
    enabled: !!id,
    staleTime: 10_000,
  });

  const { data: backendPot, isLoading: beLoading } = useQuery<Record<string, unknown> | null>({
    queryKey: ["backend-pot", id],
    queryFn: () => api<Record<string, unknown>>(`/pots/${id}`),
    enabled: !!id,
    staleTime: 10_000,
    retry: false,
  });

  const data = sgPot ? sgPotToView(sgPot, backendPot as Record<string, unknown> | undefined) : null;

  return { data, isLoading: sgLoading || beLoading, error: sgError };
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
 * Create a pot by calling PotFactory.createPot on-chain, then register
 * metadata with the backend.
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

      // Register metadata with backend (best-effort — pot already exists on-chain)
      try {
        await api("/pots", {
          method: "POST",
          body: JSON.stringify({ vault, epochId: input.epochId, strategy: input.strategy }),
        });
      } catch {
        // Backend metadata is supplementary; the on-chain pot is source of truth
      }

      return vault;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subgraph", "pots"] });
      qc.invalidateQueries({ queryKey: ["backend-pots"] });
    },
  });
}

export function usePotShares(potId: string | undefined) {
  return useQuery<Array<{ id: string; userId: string; shares: number; investedUsd: number; claimableUsd: number }>>({
    queryKey: ["pots", potId, "shares"],
    queryFn: () => api(`/pots/${potId}/shares`),
    enabled: !!potId,
    retry: false,
  });
}
