import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, TrendingUp, TrendingDown } from "lucide-react";
import LivePnL from "@/components/overlay/LivePnL";
import PositionOverlay from "@/components/overlay/PositionOverlay";

type StreamOverlayProps = {
  traderId: string;
  potId?: string;
  pnl?: number;
  positions?: Array<{
    marketId: string;
    title: string;
    side: "up" | "down";
    size: number;
    currentPnl: number;
  }>;
  className?: string;
};

export default function StreamOverlay({
  traderId,
  potId,
  pnl = 0,
  positions = [],
  className,
}: StreamOverlayProps) {
  const [visible, setVisible] = useState(true);

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 z-10 h-7 text-xs"
        onClick={() => setVisible(!visible)}
      >
        {visible ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
        {visible ? "Hide" : "Show"} Overlay
      </Button>

      {visible && (
        <div className="absolute top-2 left-2 z-10 space-y-2">
          <LivePnL pnl={pnl} />
          {positions.length > 0 && (
            <PositionOverlay positions={positions} />
          )}
        </div>
      )}
    </div>
  );
}
