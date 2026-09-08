import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTrader, usePots, usePositions, useIsFollowing, useFollow, useUnfollow } from "@/lib/queries";
import { useVaultNav, useVaultPrice } from "@/lib/vault-hooks";
import { formatUnits } from "viem";
import StreamLayout from "@/layouts/StreamLayout";
import LiveSidebar from "@/components/sidebar/LiveSidebar";
import StreamPlayer from "@/components/stream/StreamPlayer";
import StreamInfo from "@/components/stream/StreamInfo";
import StreamControls from "@/components/stream/StreamControls";
import StreamHealth from "@/components/stream/StreamHealth";
import StreamOverlay from "@/components/stream/StreamOverlay";
import StreamChat from "@/components/chat/StreamChat";
import StakePanel from "@/components/staking/StakePanel";
import { PositionTable } from "@/components/traders/PositionTable";
import { useStreamViewers } from "@/hooks/use-stream-viewers";
import { useStreamOverlay } from "@/hooks/use-stream-overlay";

export const Route = createFileRoute("/live/$id")({
  head: () => ({
    meta: [
      { title: "Live | BetterFun" },
      { name: "description", content: "Live trading stream on BetterFun." },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  const { id } = Route.useParams();
  const { data: trader, isLoading, error } = useTrader(id);
  const [notify, setNotify] = useState(false);

  const { data: pots = [] } = usePots({ traderId: id });
  const pot = pots[0] ?? null;
  const { data: followingData } = useIsFollowing(id);
  const followMutation = useFollow(id);
  const unfollowMutation = useUnfollow(id);

  const room = trader?.handle
    ? `stream-${trader.handle.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}`
    : "";

  const { data: viewerData } = useStreamViewers(room);
  const { positions, pnl } = useStreamOverlay(pot?.id ?? "", id);
  const { data: vaultNav } = useVaultNav(pot?.vaultAddress as `0x${string}` | undefined);
  const { data: vaultPrice } = useVaultPrice(pot?.vaultAddress as `0x${string}` | undefined);
  const { data: rawPositions = [] } = usePositions(pot?.id ?? "");

  const isFollowing = followingData?.following ?? false;
  const isLive = trader?.isLive ?? false;

  const handleFollow = () => {
    if (isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <p className="text-sm text-muted-foreground">Loading stream...</p>
      </div>
    );
  }

  if (error || !trader) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] gap-3">
        <h1 className="text-xl font-semibold">Stream not found</h1>
        <Link to="/traders" className="text-sm text-muted-foreground hover:text-foreground">
          Back to traders
        </Link>
      </div>
    );
  }

  const mainContent = (
    <div className="space-y-4">
      {/* Stream Player */}
      <div className="relative">
        <StreamPlayer
          traderId={id}
          traderName={trader.name ?? "Trader"}
          isLive={isLive}
          viewerCount={viewerData?.count ?? 0}
        />
        <StreamOverlay
          traderId={id}
          potId={pot?.id}
          pnl={pnl}
          positions={positions}
          className="absolute inset-0 pointer-events-none"
        />
      </div>

      {/* Stream Info */}
      <StreamInfo
        trader={trader}
        viewerCount={viewerData?.count ?? 0}
        onFollow={handleFollow}
        isFollowing={isLive}
      />

      {/* Stream Controls (for own stream) */}
      <StreamControls
        isLive={isLive}
        streamKey={room}
      />

      {/* Positions */}
      {pot && rawPositions.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">Open Positions</h3>
          <PositionTable
            positions={rawPositions.map((p: any) => ({
              id: p.id ?? p.marketId,
              marketId: p.marketId ?? p.market_id ?? "",
              symbol: p.symbol ?? p.marketTitle ?? "Market",
              side: p.side ?? "up",
              contracts: Number(p.size ?? p.amount ?? 0),
              avgPrice: Number(p.avgPrice ?? p.entryPrice ?? 0),
              status: "open",
            }))}
          />
        </div>
      )}

      {/* Stream Health */}
      {isLive && (
        <StreamHealth
          bitrate={3000}
          latency={120}
          resolution="1080p"
          status="good"
        />
      )}
    </div>
  );

  const rightRail = (
    <div className="flex flex-col gap-4 p-3">
      <StreamChat
        traderId={id}
        potId={pot?.id}
        traderName={trader.name ?? "Trader"}
        className="h-[400px]"
      />
      {pot && (
        <StakePanel
          potId={pot.id}
          nav={vaultNav != null ? Number(formatUnits(vaultNav, 6)) : 0}
          lpPrice={vaultPrice != null ? Number(formatUnits(vaultPrice, 18)) : 1}
          yourStake={0}
          totalStakers={0}
        />
      )}
    </div>
  );

  return (
    <StreamLayout
      sidebar={<LiveSidebar />}
      rightRail={rightRail}
    >
      <div className="p-4">
        {mainContent}
      </div>
    </StreamLayout>
  );
}
