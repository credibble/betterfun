import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

type Position = {
  marketId: string;
  title: string;
  side: "up" | "down";
  size: number;
  currentPnl: number;
};

type PositionOverlayProps = {
  positions: Position[];
  className?: string;
};

export default function PositionOverlay({ positions, className }: PositionOverlayProps) {
  if (positions.length === 0) return null;

  return (
    <div className={cn("rounded-lg border bg-background/90 backdrop-blur-sm p-2 max-w-xs", className)}>
      <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">Open Positions</p>
      <div className="space-y-1">
        {positions.map((pos) => (
          <div key={pos.marketId} className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1 min-w-0">
              {pos.side === "up" ? (
                <ArrowUpRight className="h-3 w-3 text-green-500 flex-shrink-0" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-blue-500 flex-shrink-0" />
              )}
              <span className="truncate">{pos.title}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-muted-foreground">${pos.size.toFixed(0)}</span>
              <span className={cn("font-medium", pos.currentPnl >= 0 ? "text-green-500" : "text-red-500")}>
                {pos.currentPnl >= 0 ? "+" : ""}{pos.currentPnl.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
