import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useMarkets as useSdkMarkets,
  useCandles as useSdkCandles,
  useLiveSpotOrderBook,
  useLiveBinaryOrderBook,
  useLivePrice,
} from "@somnia-chain/markets-sdk/react";
import { api } from "./api-client";
import { sdkMarketsToApi } from "./market-adapter";
import type {
  MarketSnapshot,
  EpochSchema,
  PotSchema,
  TraderProfileSchema,
  PositionSchema,
  PayoutSchema,
  LiveSessionSchema,
} from "@betterfun/shared";

// ── Auth ──────────────────────────────────────────────────────────────────────

export function useNonce(address: string) {
  return useQuery({
    queryKey: ["auth", "nonce", address],
    queryFn: () =>
      api<{ nonce: string; statement: string }>("/auth/nonce", {
        method: "POST",
        body: JSON.stringify({ address }),
      }),
    enabled: !!address,
    retry: false,
    staleTime: 60_000,
  });
}

export function useVerify() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { message: string; signature: string; address: string }) =>
      api<{ accessToken: string; refreshToken: string; user: any }>("/auth/verify", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      localStorage.setItem("access_token", data.accessToken);
      localStorage.setItem("refresh_token", data.refreshToken);
      qc.setQueryData(["auth", "me"], data.user);
    },
  });
}

export function useMe() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api<any>("/auth/me"),
    retry: false,
    staleTime: 60_000,
  });
}

// ── Faucet ────────────────────────────────────────────────────────────────────

export function useFaucetMint() {
  return useMutation({
    mutationFn: (input: { address: string; amount?: number }) =>
      api<{ ok: boolean; txHash: string; amountUsd: number }>("/faucet/mint", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  });
}

// ── Markets (via backend REST) ────────────────────────────────────────────────

export function useRestMarkets() {
  return useQuery({
    queryKey: ["rest-markets"],
    queryFn: () => api<any[]>("/markets"),
    refetchInterval: 30_000,
  });
}

export function useRestMarket(id: string) {
  return useQuery({
    queryKey: ["rest-markets", id],
    queryFn: () => api<any>(`/markets/${id}`),
    enabled: !!id,
    refetchInterval: 30_000,
  });
}

export function useRestOrderBook(symbol: string | undefined, depth = 5) {
  return useQuery({
    queryKey: ["rest-markets", symbol, "book", depth],
    queryFn: () =>
      api<{ bids: Array<[number, number]>; asks: Array<[number, number]> }>(
        `/markets/${symbol}/book?depth=${depth}`,
      ),
    enabled: !!symbol,
    refetchInterval: 5_000,
  });
}

export function useRestCandles(symbol: string | undefined, interval = 60, limit = 100) {
  return useQuery({
    queryKey: ["rest-markets", symbol, "candles", interval],
    queryFn: () =>
      api<Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }>>(
        `/markets/${symbol}/candles?interval=${interval}&limit=${limit}`,
      ),
    enabled: !!symbol,
    refetchInterval: 15_000,
  });
}

export function useRestPrice(asset: "BTC" | "ETH") {
  return useQuery({
    queryKey: ["rest-markets", "price", asset],
    queryFn: () => api<{ asset: string; price: number }>(`/markets/price/${asset}`),
    refetchInterval: 10_000,
  });
}

// ── Markets (via SDK) ─────────────────────────────────────────────────────────

export function useMarkets() {
  const sdk = useSdkMarkets({ limit: 200 });
  const data = useMemo(
    () => (sdk.data ? sdkMarketsToApi(sdk.data) : []),
    [sdk.data],
  ) as MarketSnapshot[];
  return { data, isLoading: sdk.loading, error: sdk.error };
}

export function useMarket(id: string) {
  const { data: markets = [], isLoading, error } = useMarkets();
  const market = useMemo(
    () => markets.find((m) => m.id === id || m.symbol === id) ?? null,
    [markets, id],
  );
  return { data: market as MarketSnapshot | null, isLoading, error };
}

const RESOLUTION_MAP: Record<string, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400,
};

export function useOrderBook(poolAddress: string | undefined) {
  const book = useLiveBinaryOrderBook(poolAddress);
  return { data: book };
}

export function useCandles(poolAddress: string | undefined, resolution?: string) {
  const intervalSec = RESOLUTION_MAP[resolution ?? "1m"] ?? 60;
  const sdk = useSdkCandles(poolAddress, intervalSec, { limit: 500 });
  return { data: sdk.data ?? [], isLoading: sdk.loading, error: sdk.error };
}

export function usePrice(asset: string) {
  const price = useLivePrice(asset.toUpperCase());
  return {
    data: price ? { asset, price: price.price } : undefined,
  };
}

// ── EpochSchemas ────────────────────────────────────────────────────────────────────

export function useEpochs() {
  return useQuery({
    queryKey: ["epochs"],
    queryFn: () => api<EpochSchema[]>("/epochs"),
  });
}

export function useActiveEpoch() {
  return useQuery({
    queryKey: ["epochs", "active"],
    queryFn: () => api<EpochSchema>("/epochs/active"),
    retry: false,
  });
}

export function useEpoch(id: string) {
  return useQuery({
    queryKey: ["epochs", id],
    queryFn: () => api<EpochSchema>(`/epochs/${id}`),
    enabled: !!id,
  });
}

// ── Pots ──────────────────────────────────────────────────────────────────────

export function usePots(params?: { epochId?: string; traderId?: string }) {
  const qs = new URLSearchParams();
  if (params?.epochId) qs.set("epochId", params.epochId);
  if (params?.traderId) qs.set("traderId", params.traderId);
  const query = qs.toString() ? `?${qs}` : "";

  return useQuery({
    queryKey: ["pots", params],
    queryFn: () => api<PotSchema[]>(`/pots${query}`),
  });
}

export function usePot(id: string) {
  return useQuery({
    queryKey: ["pots", id],
    queryFn: () => api<PotSchema>(`/pots/${id}`),
    enabled: !!id,
    refetchInterval: 10_000,
  });
}

export function useCreatePot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      epochId: string;
      strategy: { title: string; note: string; risk: "conservative" | "balanced" | "aggressive"; focus: string[] };
    }) =>
      api<PotSchema>("/pots", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pots"] }),
  });
}

export function usePotShares(potId: string | undefined) {
  return useQuery({
    queryKey: ["pots", potId, "shares"],
    queryFn: () => api<Array<{ id: string; userId: string; shares: number; investedUsd: number; claimableUsd: number }>>(`/pots/${potId}/shares`),
    enabled: !!potId,
  });
}

export function useDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { potId: string; amountUsd: number; txHash?: string }) =>
      api<{ shares: number; investedUsd: number }>(`/pots/${input.potId}/deposit`, {
        method: "POST",
        body: JSON.stringify({ amountUsd: input.amountUsd, txHash: input.txHash }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pots"] }),
  });
}

export function useWithdraw() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { potId: string; amountUsd: number }) =>
      api<{ id: string; amountUsd: number; status: string }>(`/pots/${input.potId}/withdraw`, {
        method: "POST",
        body: JSON.stringify({ amountUsd: input.amountUsd }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pots"] }),
  });
}

// ── Trading ───────────────────────────────────────────────────────────────────

export function useTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      potId: string;
      marketId: string;
      side: "buy_up" | "buy_down" | "sell_up" | "sell_down";
      sizeUsd: number;
      maxPrice?: number;
      orderType?: "ioc" | "post_only" | "limit";
    }) =>
      api<{ orderId: string; filled: number; price: number }>("/studio/trade", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["pots", vars.potId] });
      qc.invalidateQueries({ queryKey: ["trades"] });
    },
  });
}

export function usePositions(potId: string) {
  return useQuery({
    queryKey: ["trades", "positions", potId],
    queryFn: () => api<PositionSchema[]>(`/studio/positions?potId=${potId}`),
    enabled: !!potId,
  });
}

export function useTrades(potId: string) {
  return useQuery({
    queryKey: ["trades", potId],
    queryFn: () => api<any[]>(`/studio/trades?potId=${potId}`),
    enabled: !!potId,
  });
}

export function useOrders(potId: string) {
  return useQuery({
    queryKey: ["orders", potId],
    queryFn: () => api<any[]>(`/studio/orders?potId=${potId}`),
    enabled: !!potId,
    refetchInterval: 10_000,
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { potId: string; orderId: string }) =>
      api<{ ok: boolean }>("/studio/cancel", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["orders", vars.potId] });
      qc.invalidateQueries({ queryKey: ["trades"] });
      qc.invalidateQueries({ queryKey: ["pots", vars.potId] });
    },
  });
}

// ── Settlement ────────────────────────────────────────────────────────────────

export function usePayout(potId: string) {
  return useQuery({
    queryKey: ["payout", potId],
    queryFn: () => api<PayoutSchema>(`/settlement/${potId}`),
    enabled: !!potId,
  });
}

export function useClaimPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { potId: string; userAddress: string }) =>
      api<{ amount: number; txHash: string }>(`/settlement/${input.potId}/claim`, {
        method: "POST",
        body: JSON.stringify({ userAddress: input.userAddress }),
      }),
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ["payout", input.potId] });
      qc.invalidateQueries({ queryKey: ["pots", input.potId] });
    },
  });
}

export function useSettleEpoch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (epochId: string) =>
      api<{ ok: boolean }>(`/settlement/epoch/${epochId}/settle`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["epochs"] }),
  });
}

// ── Demo / dev tools ─────────────────────────────────────────────────────────

export function useDemoSeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ ok: boolean; epoch: any }>("/demo/seed", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["epochs"] }),
  });
}

export function useDemoFastForward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (epochId: string) =>
      api<{ ok: boolean; action: string; status: string }>(`/demo/fast-forward/${epochId}`, {
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["epochs"] });
      qc.invalidateQueries({ queryKey: ["pots"] });
      qc.invalidateQueries({ queryKey: ["settlement"] });
    },
  });
}

// ── Traders ───────────────────────────────────────────────────────────────────

export function useTraders() {
  return useQuery({
    queryKey: ["traders"],
    queryFn: () => api<TraderProfileSchema[]>("/traders"),
  });
}

export function useTrader(id: string) {
  return useQuery({
    queryKey: ["traders", id],
    queryFn: () => api<TraderProfileSchema>(`/traders/${id}`),
    enabled: !!id,
  });
}

export function useMyTrader() {
  return useQuery({
    queryKey: ["traders", "me"],
    queryFn: () => api<TraderProfileSchema>("/traders/me"),
    retry: false,
    staleTime: 60_000,
  });
}

export function useCreateTrader() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      handle: string;
      traderType: "human" | "ai";
      bio?: string;
      country?: string;
      tags?: string[];
      aiConfig?: { model: string; skills: string[]; description: string };
    }) =>
      api<{ trader: TraderProfileSchema; accessToken: string }>("/traders", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      localStorage.setItem("access_token", data.accessToken);
      qc.setQueryData(["traders", "me"], data.trader);
      qc.invalidateQueries({ queryKey: ["traders"] });
    },
  });
}

export function useUpdateTrader() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name?: string; bio?: string; country?: string; tags?: string[] }) =>
      api<TraderProfileSchema>("/traders/me", {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      qc.setQueryData(["traders", "me"], data);
      qc.invalidateQueries({ queryKey: ["traders"] });
    },
  });
}

// ── LiveKit ───────────────────────────────────────────────────────────────────

export function useLiveKitToken() {
  return useMutation({
    mutationFn: (room: string) =>
      api<{ token: string; url: string }>("/livekit/token", {
        method: "POST",
        body: JSON.stringify({ room }),
      }),
  });
}

export function useLiveKitStreamSetup() {
  return useMutation({
    mutationFn: (room: string) =>
      api<{ rtmpUrl: string; streamKey: string; serverUrl: string; ingressId?: string; configured?: boolean }>("/livekit/stream-setup", {
        method: "POST",
        body: JSON.stringify({ room }),
      }),
  });
}

export function useLiveKitRoom() {
  return useMutation({
    mutationFn: (name: string) =>
      api<{ room: any }>("/livekit/room", { method: "POST", body: JSON.stringify({ name }) }),
  });
}

export function useLiveKitParticipants(room: string | undefined) {
  return useQuery({
    queryKey: ["livekit", room, "participants"],
    queryFn: () => api<any[]>(`/livekit/${room}/participants`),
    enabled: !!room,
    refetchInterval: 10_000,
  });
}

// ── Comments ─────────────────────────────────────────────────────────────────

export function useComments(marketId: string) {
  return useQuery({
    queryKey: ["comments", marketId],
    queryFn: () => api<Comment[]>(`/comments/${marketId}`),
    enabled: !!marketId,
  });
}

export function usePostComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ marketId, text }: { marketId: string; text: string }) =>
      api<Comment>(`/comments/${marketId}`, {
        method: "POST",
        body: JSON.stringify({ text }),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["comments", vars.marketId] });
    },
  });
}

export function useLikeComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) =>
      api<{ ok: boolean }>(`/comments/${commentId}/like`, { method: "POST" }),
  });
}
