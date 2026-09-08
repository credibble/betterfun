import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import SidebarTraderCard from "./SidebarTraderCard";
import CategoryFilter from "./CategoryFilter";
import { useLiveStreams } from "@/hooks/use-live-streams";
import type { TraderProfileSchema as Trader } from "@betterfun/shared";

type LiveSidebarProps = {
  className?: string;
};

export default function LiveSidebar({ className }: LiveSidebarProps) {
  const { data: liveTraders = [], isLoading } = useLiveStreams();

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="p-3 border-b">
        <h3 className="text-sm font-semibold mb-2">Live Traders</h3>
        <CategoryFilter />
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-2 w-12" />
                </div>
              </div>
            ))
          ) : liveTraders.length === 0 ? (
            <p className="text-xs text-muted-foreground p-4 text-center">
              No traders live right now
            </p>
          ) : (
            liveTraders.map((trader: Trader) => (
              <SidebarTraderCard key={trader.id} trader={trader} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
