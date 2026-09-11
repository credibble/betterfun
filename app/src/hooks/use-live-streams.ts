import { useQuery } from "@tanstack/react-query";
import type { TraderView } from "@/lib/types";
import { getTraders } from "@/lib/subgraph";
import { STREAM_OVERRIDES, getStreamOverride } from "@/lib/stream-overrides";

/**
 * Live streams are shown from the subgraph trader list (on-chain registered
 * traders), plus any configured demo traders with a stream override. "Live"
 * status is not tracked on-chain yet, so the subgraph roster is treated as
 * live; override traders are always injected so their recorded feed shows up
 * on the home page regardless of subgraph state.
 */
export function useLiveStreams() {
  return useQuery<TraderView[]>({
    queryKey: ["subgraph", "traders", "streams"],
    queryFn: async () => {
      const sg = await getTraders();
      const roster = sg.map((t) => ({
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
        videoUrl: getStreamOverride(t.id) ?? undefined,
        followers: 0,
        createdAt: t.registeredAt,
        updatedAt: t.updatedAt,
      }));

      for (const [address, url] of Object.entries(STREAM_OVERRIDES)) {
        if (roster.some((t) => t.id.toLowerCase() === address)) continue;
        roster.push({
          id: address,
          userId: address,
          traderType: "human",
          name: `Trader ${address.slice(0, 6)}`,
          handle: address.slice(2, 10).toLowerCase(),
          avatarUrl: "",
          bio: "Featured demo trader",
          country: "",
          tags: [],
          verified: false,
          reputation: 0,
          pnl30: 0,
          winRate: 0,
          aum: 0,
          isLive: true,
          videoUrl: url,
          followers: 0,
          createdAt: "",
          updatedAt: "",
        });
      }

      return roster;
    },
    staleTime: 30_000,
  });
}
