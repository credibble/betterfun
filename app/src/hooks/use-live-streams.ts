import { useQuery } from "@tanstack/react-query";
import type { TraderView } from "@/lib/types";
import { getTraders } from "@/lib/subgraph";

/**
 * Live streams are shown from the subgraph trader list (on-chain registered
 * traders). "Live" status is not tracked on-chain yet, so we return all
 * registered traders as the stream roster.
 */
export function useLiveStreams() {
  return useQuery<TraderView[]>({
    queryKey: ["subgraph", "traders", "streams"],
    queryFn: async () => {
      const sg = await getTraders();
      return sg.map((t) => ({
        id: t.id,
        userId: t.id,
        traderType: (t.traderType === "ALGO" ? "ai" : "human") as "human" | "ai",
        name: t.id.slice(0, 10),
        handle: t.id.slice(0, 8),
        avatarUrl: "",
        bio: "",
        country: "",
        tags: [],
        verified: t.verified,
        reputation: 0,
        pnl30: 0,
        winRate: 0,
        aum: 0,
        isLive: true,
        videoUrl: undefined,
        followers: 0,
        createdAt: t.registeredAt,
        updatedAt: t.updatedAt,
      }));
    },
    staleTime: 30_000,
  });
}