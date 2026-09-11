import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { TraderRegistryAbi, ADDRESSES } from "../contracts";
import { getTraders, getTrader, type SubgraphTrader } from "../subgraph";
import { api } from "../api-client";
import type { TraderView } from "../types";

function sgTraderToView(sg: SubgraphTrader, backend?: Record<string, unknown>): TraderView {
  const be = backend ?? {};
  return {
    id: sg.id,
    userId: sg.id,
    traderType: sg.traderType === "ALGO" ? "ai" : "human",
    name: (be.name as string) ?? sg.id.slice(0, 10),
    handle: (be.handle as string) ?? sg.id.slice(0, 8),
    avatarUrl: (be.avatarUrl as string) ?? "",
    bio: (be.bio as string) ?? "",
    country: (be.country as string) ?? "",
    tags: (be.tags as string[]) ?? [],
    verified: sg.verified,
    reputation: 0,
    pnl30: 0,
    winRate: 0,
    aum: 0,
    isLive: (be.isLive as boolean) ?? false,
    videoUrl: be.videoUrl as string | undefined,
    followers: 0,
    createdAt: sg.registeredAt,
    updatedAt: sg.updatedAt,
  };
}

// ── Subgraph + backend reads ──────────────────────────────────────────────────

export function useTraders() {
  const { data: sgTraders = [], isLoading: sgLoading, error: sgError } = useQuery<SubgraphTrader[]>({
    queryKey: ["subgraph", "traders"],
    queryFn: () => getTraders(),
    staleTime: 30_000,
  });

  const { data: backendTraders = [], isLoading: beLoading } = useQuery<Record<string, unknown>[]>({
    queryKey: ["backend-traders"],
    queryFn: () => api<Record<string, unknown>[]>("/traders"),
    staleTime: 30_000,
    retry: false,
  });

  const backendMap = new Map(
    backendTraders.map((t) => [t.id, t])
  );

  const data = sgTraders.map((sg) => {
    const be = backendMap.get(sg.id) ?? backendTraders.find((b) => (b.userId as string)?.toLowerCase() === sg.id.toLowerCase());
    return sgTraderToView(sg, be);
  });

  return { data, isLoading: sgLoading || beLoading, error: sgError };
}

export function useTrader(id: string) {
  const { data: sgTrader, isLoading: sgLoading, error: sgError } = useQuery<SubgraphTrader | null>({
    queryKey: ["subgraph", "trader", id],
    queryFn: () => getTrader(id),
    enabled: !!id,
    staleTime: 30_000,
  });

  const { data: backendTrader, isLoading: beLoading } = useQuery<Record<string, unknown> | null>({
    queryKey: ["backend-trader", id],
    queryFn: () => api<Record<string, unknown>>(`/traders/${id}`),
    enabled: !!id,
    staleTime: 30_000,
    retry: false,
  });

  const data = (() => {
    if (!sgTrader && !backendTrader) return null;
    if (sgTrader) return sgTraderToView(sgTrader, backendTrader ?? undefined);
    const be = backendTrader!;
    return {
      id: (be.id as string) ?? id,
      userId: (be.userId as string) ?? id,
      traderType: (be.traderType as "human" | "ai") ?? "human",
      name: (be.name as string) ?? id.slice(0, 10),
      handle: (be.handle as string) ?? id.slice(0, 8),
      avatarUrl: (be.avatarUrl as string) ?? "",
      bio: (be.bio as string) ?? "",
      country: (be.country as string) ?? "",
      tags: (be.tags as string[]) ?? [],
      verified: (be.verified as boolean) ?? false,
      reputation: 0,
      pnl30: 0,
      winRate: 0,
      aum: 0,
      isLive: (be.isLive as boolean) ?? false,
      videoUrl: be.videoUrl as string | undefined,
      followers: 0,
      createdAt: (be.createdAt as string) ?? "",
      updatedAt: (be.updatedAt as string) ?? "",
    } satisfies TraderView;
  })();

  return { data, isLoading: sgLoading || beLoading, error: sgError };
}

/**
 * Current user's trader profile — combines on-chain state + backend metadata.
 */
export function useMyTrader() {
  const { address } = useAccount();

  const { data: onChainProfile, isLoading: ocLoading } = useReadContract({
    address: ADDRESSES.TRADER_REGISTRY,
    abi: TraderRegistryAbi,
    functionName: "getTrader",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: backendProfile, isLoading: beLoading } = useQuery<Record<string, unknown>>({
    queryKey: ["traders", "me"],
    queryFn: () => api("/traders/me"),
    retry: false,
    staleTime: 60_000,
  });

  const data = (() => {
    if (!onChainProfile && !backendProfile) return null;

    const oc = onChainProfile as unknown as {
      metadataCID: string;
      payoutAddress: string;
      traderType: number;
      verified: boolean;
      active: boolean;
      registeredAt: bigint;
      potCount: bigint;
      totalAUM: bigint;
    } | undefined;

    const be = backendProfile ?? {};

    return {
      id: (be.id as string) ?? address ?? "",
      userId: (be.userId as string) ?? address ?? "",
      traderType: (be.traderType as "human" | "ai") ?? (oc?.traderType === 1 ? "ai" : "human"),
      name: (be.name as string) ?? "",
      handle: (be.handle as string) ?? "",
      avatarUrl: (be.avatarUrl as string) ?? "",
      bio: (be.bio as string) ?? "",
      country: (be.country as string) ?? "",
      tags: (be.tags as string[]) ?? [],
      verified: oc?.verified ?? (be.verified as boolean) ?? false,
      reputation: 0,
      pnl30: 0,
      winRate: 0,
      aum: oc ? Number(oc.totalAUM) / 1e6 : 0,
      isLive: (be.isLive as boolean) ?? false,
      videoUrl: be.videoUrl as string | undefined,
      followers: 0,
      createdAt: oc?.registeredAt ? String(oc.registeredAt) : ((be.createdAt as string) ?? ""),
      updatedAt: (be.updatedAt as string) ?? "",
    };
  })();

  return { data, isLoading: ocLoading || beLoading };
}

/** Typed accessor for myTrader data. */
export function useMyTraderProfile() {
  const { data: raw, ...rest } = useMyTrader();
  const data = raw
    ? {
        id: raw.id,
        name: raw.name,
        handle: raw.handle,
        avatarUrl: raw.avatarUrl,
        bio: raw.bio,
        country: raw.country,
        tags: raw.tags,
        traderType: raw.traderType as "human" | "ai",
        aiConfig: undefined as { model: string; skills: string[]; description: string } | undefined,
        verified: raw.verified,
        isLive: raw.isLive,
        followers: raw.followers,
        pnl30: raw.pnl30,
        winRate: raw.winRate,
        aum: raw.aum,
      }
    : null;
  return { data, ...rest };
}

// ── Contract reads ────────────────────────────────────────────────────────────

export function useTraderProfile(address: `0x${string}` | undefined) {
  return useReadContract({
    address: ADDRESSES.TRADER_REGISTRY,
    abi: TraderRegistryAbi,
    functionName: "getTrader",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useTraderCount() {
  return useReadContract({
    address: ADDRESSES.TRADER_REGISTRY,
    abi: TraderRegistryAbi,
    functionName: "traderCount",
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Register a trader on-chain via TraderRegistry.registerTrader, then
 * create the backend profile and get a JWT.
 */
export function useCreateTrader() {
  const { writeContractAsync } = useWriteContract();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      handle: string;
      traderType: "human" | "ai";
      bio?: string;
      country?: string;
      tags?: string[];
      aiConfig?: { model: string; skills: string[]; description: string };
      payoutAddress?: `0x${string}`;
    }) => {
      // On-chain registration (metadataCID is placeholder — real metadata lives in backend)
      const zeroBytes32 = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
      await writeContractAsync({
        address: ADDRESSES.TRADER_REGISTRY,
        abi: TraderRegistryAbi,
        functionName: "registerTrader",
        args: [
          zeroBytes32,
          input.payoutAddress ?? "0x0000000000000000000000000000000000000000",
          input.traderType === "ai" ? 1 : 0,
        ],
      });

      // Backend profile + JWT
      const result = await api<{ trader: Record<string, unknown>; accessToken: string }>("/traders", {
        method: "POST",
        body: JSON.stringify(input),
      });

      return result;
    },
    onSuccess: (data) => {
      localStorage.setItem("access_token", data.accessToken);
      qc.setQueryData(["traders", "me"], data.trader);
      qc.invalidateQueries({ queryKey: ["subgraph", "traders"] });
      qc.invalidateQueries({ queryKey: ["backend-traders"] });
    },
  });
}

export function useUpdateTrader() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name?: string; avatarUrl?: string; bio?: string; country?: string; tags?: string[] }) =>
      api<Record<string, unknown>>("/traders/me", {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      qc.setQueryData(["traders", "me"], data);
      qc.invalidateQueries({ queryKey: ["backend-traders"] });
    },
  });
}

export function useSetLive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (isLive: boolean) =>
      api<Record<string, unknown>>("/traders/me/live", {
        method: "PATCH",
        body: JSON.stringify({ isLive }),
      }),
    onSuccess: (data) => {
      qc.setQueryData(["traders", "me"], data);
      qc.invalidateQueries({ queryKey: ["backend-traders"] });
    },
  });
}

// ── Follow / Unfollow (off-chain social — kept on backend) ───────────────────

export function useIsFollowing(traderId: string) {
  return useQuery<{ following: boolean }>({
    queryKey: ["follow", traderId],
    queryFn: () => api(`/traders/${traderId}/following`),
    enabled: !!traderId,
    retry: false,
  });
}

export function useFollow(traderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api<{ following: boolean; followers: number }>(`/traders/${traderId}/follow`, {
        method: "POST",
      }),
    onSuccess: (data) => {
      qc.setQueryData(["follow", traderId], { following: data.following });
      qc.invalidateQueries({ queryKey: ["backend-traders"] });
    },
  });
}

export function useUnfollow(traderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api<{ following: boolean; followers: number }>(`/traders/${traderId}/follow`, {
        method: "DELETE",
      }),
    onSuccess: (data) => {
      qc.setQueryData(["follow", traderId], { following: data.following });
      qc.invalidateQueries({ queryKey: ["backend-traders"] });
    },
  });
}

// ── Upload ────────────────────────────────────────────────────────────────────

export function useUploadImage() {
  return useMutation({
    mutationFn: async (file: File) => {
      const { apiUpload } = await import("../api-client");
      const formData = new FormData();
      formData.append("file", file);
      return apiUpload<{ url: string; publicId: string }>("/upload/image", formData);
    },
  });
}

// ── Contract write: update payout address ─────────────────────────────────────

/**
 * Update the trader's on-chain payout address via TraderRegistry.updatePayoutAddress.
 */
export function useUpdatePayoutAddress() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  const updatePayoutAddress = async (newAddress: `0x${string}`) => {
    await writeContractAsync({
      address: ADDRESSES.TRADER_REGISTRY,
      abi: TraderRegistryAbi,
      functionName: "updatePayoutAddress",
      args: [newAddress],
    });
  };

  return { updatePayoutAddress, hash, isPending, receipt, error };
}
