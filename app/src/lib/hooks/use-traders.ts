import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useAccount } from "wagmi";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { TraderRegistryAbi, ADDRESSES } from "../contracts";
import { getTraders, getTrader, type SubgraphTrader } from "../subgraph";
import { hasStreamOverride, getStreamOverride } from "../stream-overrides";
import type { TraderView } from "../types";

/** Parse the on-chain JSON metadata string stored in TraderRegistry. */
export interface TraderMetadata {
  name?: string;
  handle?: string;
  bio?: string;
  avatarUrl?: string;
  country?: string;
  tags?: string[];
}

export function parseTraderMetadata(raw: string): TraderMetadata {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as TraderMetadata;
    return {
      name: typeof parsed.name === "string" ? parsed.name : undefined,
      handle: typeof parsed.handle === "string" ? parsed.handle : undefined,
      bio: typeof parsed.bio === "string" ? parsed.bio : undefined,
      avatarUrl: typeof parsed.avatarUrl === "string" ? parsed.avatarUrl : undefined,
      country: typeof parsed.country === "string" ? parsed.country : undefined,
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.filter((t) => typeof t === "string")
        : undefined,
    };
  } catch {
    return {};
  }
}

function sgTraderToView(sg: SubgraphTrader): TraderView {
  const meta = parseTraderMetadata(sg.metadata);
  return {
    id: sg.id,
    userId: sg.id,
    traderType: sg.traderType === "ALGO" ? "ai" : "human",
    name: meta.name ?? sg.id.slice(0, 10),
    handle: meta.handle ?? sg.id.slice(0, 8),
    avatarUrl: meta.avatarUrl ?? "",
    bio: meta.bio ?? "",
    country: meta.country ?? "",
    tags: meta.tags ?? [],
    verified: sg.verified,
    reputation: 0,
    pnl30: 0,
    winRate: 0,
    aum: 0,
    isLive: hasStreamOverride(sg.id),
    videoUrl: getStreamOverride(sg.id) ?? undefined,
    followers: 0,
    createdAt: sg.registeredAt,
    updatedAt: sg.updatedAt,
  };
}

// ── Subgraph reads ──────────────────────────────────────────────────────────

export function useTraders() {
  const {
    data: sgTraders = [],
    isLoading,
    error,
  } = useQuery<SubgraphTrader[]>({
    queryKey: ["subgraph", "traders"],
    queryFn: () => getTraders(),
    staleTime: 30_000,
  });

  const data = sgTraders.map(sgTraderToView);
  return { data, isLoading, error };
}

export function useTrader(id: string) {
  const {
    data: sgTrader,
    isLoading,
    error,
  } = useQuery<SubgraphTrader | null>({
    queryKey: ["subgraph", "trader", id],
    queryFn: () => getTrader(id),
    enabled: !!id,
    staleTime: 30_000,
  });

  const data = sgTrader ? sgTraderToView(sgTrader) : null;
  return { data, isLoading, error };
}

/**
 * Current user's trader profile — on-chain TraderRegistry only.
 * Exposes whether the trader exists on-chain (in TraderRegistry/subgraph).
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

  const data = (() => {
    if (!address) return null;

    const oc = onChainProfile as unknown as
      | {
          metadata: string;
          payoutAddress: string;
          traderType: number;
          verified: boolean;
          active: boolean;
          registeredAt: bigint;
          potCount: bigint;
          totalAUM: bigint;
        }
      | undefined;

    if (!oc || (oc.registeredAt ?? 0n) === 0n) return null;

    const meta = parseTraderMetadata(oc.metadata);

    return {
      id: address,
      userId: address,
      traderType: (oc.traderType === 1 ? "ai" : "human") as "human" | "ai",
      name: meta.name ?? "",
      handle: meta.handle ?? "",
      avatarUrl: meta.avatarUrl ?? "",
      bio: meta.bio ?? "",
      country: meta.country ?? "",
      tags: meta.tags ?? [],
      verified: oc.verified,
      reputation: 0,
      pnl30: 0,
      winRate: 0,
      aum: Number(oc.totalAUM) / 1e6,
      isLive: false,
      videoUrl: undefined,
      followers: 0,
      createdAt: String(oc.registeredAt),
      updatedAt: "",
    } satisfies TraderView;
  })();

  // Whether the wallet is registered on-chain (active profile in TraderRegistry)
  const oc = onChainProfile as unknown as { active: boolean; registeredAt: bigint } | undefined;
  const onChainExists = !!oc && (oc.active || (oc.registeredAt ?? 0n) > 0n);

  return { data, isLoading: ocLoading, onChainExists };
}

/** Typed accessor for myTrader data. */
export function useMyTraderProfile() {
  const { data: raw, onChainExists, ...rest } = useMyTrader();
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
  return { data, onChainExists, ...rest };
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

/** Serialize trader profile fields into the on-chain JSON metadata string. */
export function buildTraderMetadata(input: {
  name: string;
  handle: string;
  bio?: string;
  country?: string;
  tags?: string[];
  avatarUrl?: string;
}): string {
  const meta: TraderMetadata = {
    name: input.name,
    handle: input.handle,
    bio: input.bio,
    country: input.country,
    tags: input.tags,
    avatarUrl: input.avatarUrl,
  };
  // Drop undefined fields to keep the stored JSON lean
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (v !== undefined) clean[k] = v;
  }
  return JSON.stringify(clean);
}

/**
 * Register the connected wallet on-chain via TraderRegistry.registerTrader.
 * Used when creating a trader that is not yet in the subgraph.
 */
export function useRegisterTraderOnChain() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const { address } = useAccount();

  const register = async (input: {
    metadata: string;
    traderType: "human" | "ai";
    payoutAddress?: `0x${string}`;
  }) => {
    if (!address) throw new Error("Wallet not connected");
    await writeContractAsync({
      address: ADDRESSES.TRADER_REGISTRY,
      abi: TraderRegistryAbi,
      functionName: "registerTrader",
      args: [input.metadata, input.payoutAddress ?? address, input.traderType === "ai" ? 1 : 0],
    });
  };

  return { register, hash, isPending, receipt, error };
}

/**
 * Update the trader's on-chain metadata JSON string via
 * TraderRegistry.updateMetadata.
 */
export function useUpdateTraderMetadata() {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  const updateMetadata = async (metadata: string) => {
    await writeContractAsync({
      address: ADDRESSES.TRADER_REGISTRY,
      abi: TraderRegistryAbi,
      functionName: "updateMetadata",
      args: [metadata],
    });
  };

  return { updateMetadata, hash, isPending, receipt, error };
}

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

// ── Upload ────────────────────────────────────────────────────────────────────

/**
 * Upload an image to Cloudinary via the backend. Returns the hosted URL,
 * which is then stored in the on-chain trader metadata JSON.
 */
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
