import { useQuery } from "@tanstack/react-query";

export function useMarkets() {
  return useQuery<{ id: string; symbol: string; asset: string; status: string; upPrice: number; downPrice: number; volume: number; expiry: string; poolAddress: string }[]>({
    queryKey: ["markets"],
    queryFn: () => Promise.resolve([]),
    staleTime: 30_000,
  });
}

export function useMarket(id: string) {
  const { data: markets = [], isLoading, error } = useMarkets();
  const market = markets.find((m) => m.id === id || m.symbol === id) ?? null;
  return { data: market, isLoading, error };
}
