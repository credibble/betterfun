import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

type LivePnLProps = {
  pnl: number;
  className?: string;
};

export default function LivePnL({ pnl, className }: LivePnLProps) {
  const [prevPnl, setPrevPnl] = useState(pnl);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (pnl !== prevPnl) {
      setFlash(pnl > prevPnl ? "up" : "down");
      setPrevPnl(pnl);
      const timer = setTimeout(() => setFlash(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [pnl, prevPnl]);

  const isPositive = pnl >= 0;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border bg-background/90 backdrop-blur-sm px-3 py-1.5 transition-colors",
        flash === "up" && "bg-green-500/10 border-green-500/30",
        flash === "down" && "bg-red-500/10 border-red-500/30",
        className
      )}
    >
      {isPositive ? (
        <TrendingUp className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <TrendingDown className="h-3.5 w-3.5 text-red-500" />
      )}
      <span className={cn("text-sm font-bold tabular-nums", isPositive ? "text-green-500" : "text-red-500")}>
        {isPositive ? "+" : ""}{pnl.toFixed(2)}%
      </span>
    </div>
  );
}
