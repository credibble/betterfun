import { useQuery } from "@tanstack/react-query";
import {
  getTrades,
  type SubgraphTrade,
} from "./subgraph";

export function useSubgraphTrades(potId: string | null, first?: number) {
  return useQuery<SubgraphTrade[]>({
    queryKey: ["subgraph", "trades", potId, first],
    queryFn: () => getTrades(potId!, first),
    enabled: !!potId,
    staleTime: 10_000,
  });
}
