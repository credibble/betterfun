import { useReadContract } from "wagmi";
import { EpochControllerAbi, ADDRESSES } from "../contracts";
import { useQuery } from "@tanstack/react-query";
import { getEpochs, getEpoch, type SubgraphEpoch } from "../subgraph";

function mapEpochState(s: string): "upcoming" | "live" | "settling" | "settled" {
  const m: Record<string, "upcoming" | "live" | "settling" | "settled"> = {
    UPCOMING: "upcoming",
    LIVE: "live",
    SETTLING: "settling",
    SETTLED: "settled",
  };
  return m[s] ?? "upcoming";
}

// ── Contract reads (canonical epoch data) ─────────────────────────────────────

/** Read a single epoch struct from the EpochController. */
export function useEpochOnChain(epochId: bigint | undefined) {
  return useReadContract({
    address: ADDRESSES.EPOCH_CONTROLLER,
    abi: EpochControllerAbi,
    functionName: "epochs",
    args: epochId !== undefined ? [epochId] : undefined,
    query: { enabled: epochId !== undefined },
  });
}

/** Check if an epoch is settling on-chain. */
export function useEpochIsSettling(epochId: bigint | undefined) {
  return useReadContract({
    address: ADDRESSES.EPOCH_CONTROLLER,
    abi: EpochControllerAbi,
    functionName: "isSettling",
    args: epochId !== undefined ? [epochId] : undefined,
    query: { enabled: epochId !== undefined },
  });
}

// ── Subgraph reads (bulk data) ────────────────────────────────────────────────

export function useEpochs() {
  const { data: sgEpochs = [], isLoading, error } = useQuery<SubgraphEpoch[]>({
    queryKey: ["subgraph", "epochs"],
    queryFn: () => getEpochs(),
    staleTime: 30_000,
  });

  const data = sgEpochs.map((e) => ({
    id: e.id,
    number: parseInt(e.id) || 0,
    startsAt: Number(e.startsAt) || 0,
    endsAt: Number(e.endsAt) || 0,
    status: mapEpochState(e.state) as "upcoming" | "live" | "settling" | "settled",
    potCount: 0,
    tvl: 0,
    createdAt: e.createdAt,
  }));

  return { data, isLoading, error };
}

export function useActiveEpoch() {
  const { data: sgEpochs = [], isLoading, error } = useQuery<SubgraphEpoch[]>({
    queryKey: ["subgraph", "epochs"],
    queryFn: () => getEpochs(),
    staleTime: 30_000,
  });

  const data = (() => {
    const active = sgEpochs.find((e) => e.state === "LIVE");
    if (!active) return null;
    return {
      id: active.id,
      number: parseInt(active.id) || 0,
      startsAt: Number(active.startsAt) || 0,
      endsAt: Number(active.endsAt) || 0,
      status: "live" as const,
      potCount: 0,
      tvl: 0,
      createdAt: active.createdAt,
    };
  })();

  return { data, isLoading, error };
}

export function useEpoch(id: string) {
  const { data: sgEpoch, isLoading, error } = useQuery<SubgraphEpoch | null>({
    queryKey: ["subgraph", "epoch", id],
    queryFn: () => getEpoch(id),
    enabled: !!id,
    staleTime: 30_000,
  });

  const data = (() => {
    if (!sgEpoch) return null;
    return {
      id: sgEpoch.id,
      number: parseInt(sgEpoch.id) || 0,
      startsAt: Number(sgEpoch.startsAt) || 0,
      endsAt: Number(sgEpoch.endsAt) || 0,
      status: mapEpochState(sgEpoch.state) as "upcoming" | "live" | "settling" | "settled",
      potCount: 0,
      tvl: 0,
      createdAt: sgEpoch.createdAt,
    };
  })();

  return { data, isLoading, error };
}

// ── Contract reads (live epoch state) ─────────────────────────────────────────

export function useEpochCount() {
  return useReadContract({
    address: ADDRESSES.EPOCH_CONTROLLER,
    abi: EpochControllerAbi,
    functionName: "epochCount",
  });
}

export function useLatestEpochId() {
  return useReadContract({
    address: ADDRESSES.EPOCH_CONTROLLER,
    abi: EpochControllerAbi,
    functionName: "latestEpoch",
  });
}

export function useIsFundingOpen(epochId: bigint | undefined) {
  return useReadContract({
    address: ADDRESSES.EPOCH_CONTROLLER,
    abi: EpochControllerAbi,
    functionName: "isFundingOpen",
    args: epochId !== undefined ? [epochId] : undefined,
    query: { enabled: epochId !== undefined },
  });
}

export function useIsTradingOpen(epochId: bigint | undefined) {
  return useReadContract({
    address: ADDRESSES.EPOCH_CONTROLLER,
    abi: EpochControllerAbi,
    functionName: "isTradingOpen",
    args: epochId !== undefined ? [epochId] : undefined,
    query: { enabled: epochId !== undefined },
  });
}
