import StreamCard from "./StreamCard";
import { useLiveStreams } from "@/hooks/use-live-streams";
import { Skeleton } from "@/components/ui/skeleton";
import type { TraderProfileSchema as Trader } from "@betterfun/shared";

export default function LiveStreamGrid() {
  const { data: liveTraders = [], isLoading } = useLiveStreams();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-video rounded-xl" />
        ))}
      </div>
    );
  }

  if (liveTraders.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No traders live right now</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {liveTraders.map((trader: Trader) => (
        <StreamCard key={trader.id} trader={trader} />
      ))}
    </div>
  );
}
