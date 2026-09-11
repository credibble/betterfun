import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api-client";
import type { AuthUser, AuthVerifyResult } from "./types";

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
      api<AuthVerifyResult>("/auth/verify", {
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
  return useQuery<AuthUser>({
    queryKey: ["auth", "me"],
    queryFn: () => api("/auth/me"),
    retry: false,
    staleTime: 60_000,
  });
}

export function useFaucetMint() {
  return useMutation({
    mutationFn: (input: { address: string; amount?: number }) =>
      api<{ ok: boolean; txHash: string; amountUsd: number }>("/faucet/mint", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  });
}
