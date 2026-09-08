import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import StreamCard from "./StreamCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { TraderProfileSchema as Trader } from "@betterfun/shared";

export default function OfflineTraders() {
  const { data: traders = [], isLoading } = useQuery<Trader[]>({
    queryKey: ["top-traders"],
    queryFn: () => api<Trader[]>("/traders/top?limit=8"),
  });

  const offline = traders.filter((t) => !t.isLive);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-video rounded-xl" />
        ))}
      </div>
    );
  }

  if (offline.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Top Traders</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {offline.map((trader: Trader) => (
          <StreamCard key={trader.id} trader={trader} />
        ))}
      </div>
    </div>
  );
}
