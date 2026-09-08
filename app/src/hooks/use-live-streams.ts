import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { TraderProfileSchema as Trader } from "@betterfun/shared";

export function useLiveStreams() {
  return useQuery<Trader[]>({
    queryKey: ["live-streams"],
    queryFn: () => api<Trader[]>("/traders/live"),
    refetchInterval: 10_000,
  });
}
