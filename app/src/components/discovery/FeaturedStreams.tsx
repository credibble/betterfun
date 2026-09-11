import StreamCard from "./StreamCard";
import { useLiveStreams } from "@/hooks/use-live-streams";
import { Skeleton } from "@/components/ui/skeleton";
import type { TraderView as Trader } from "@/lib/types";

export default function FeaturedStreams() {
  const { data: liveTraders = [], isLoading } = useLiveStreams();
  const featured = liveTraders.slice(0, 2);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="aspect-video rounded-xl" />
        ))}
      </div>
    );
  }

  if (featured.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Featured Streams</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {featured.map((trader: Trader) => (
          <StreamCard key={trader.id} trader={trader} featured />
        ))}
      </div>
    </div>
  );
}
