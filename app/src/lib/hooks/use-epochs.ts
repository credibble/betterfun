import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { EpochControllerAbi, ADDRESSES } from "../contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

// ── Epoch lifecycle transitions (keeper-style, callable by anyone) ────────────

/**
 * Fast-forward an epoch by calling the appropriate EpochController transition
 * based on its current status:
 *   UPCOMING → goLive, LIVE → goSettling, SETTLING → goSettled.
 * The contract still enforces its time gates, so a premature call reverts.
 */
export function useFastForwardEpoch() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const qc = useQueryClient();

  const fastForward = async (epochId: string, status: string) => {
    const id = BigInt(epochId);
    const fn =
      status === "upcoming" ? "goLive" :
      status === "live" ? "goSettling" :
      status === "settling" ? "goSettled" :
      null;
    if (!fn) throw new Error("Epoch is already settled");

    await writeContractAsync({
      address: ADDRESSES.EPOCH_CONTROLLER,
      abi: EpochControllerAbi,
      functionName: fn,
      args: [id],
    });

    qc.invalidateQueries({ queryKey: ["subgraph", "epochs"] });
    qc.invalidateQueries({ queryKey: ["subgraph", "epoch"] });
    qc.invalidateQueries({ queryKey: ["subgraph", "pots"] });
  };

  return { fastForward, hash, isPending, receipt, error };
}
