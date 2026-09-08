import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import type { TraderProfileSchema as Trader } from "@betterfun/shared";

type SidebarTraderCardProps = {
  trader: Trader;
};

export default function SidebarTraderCard({ trader }: SidebarTraderCardProps) {
  const pnl = trader.pnl30 ?? 0;

  return (
    <Link
      to={`/live/${trader.id}` as any}
      className={cn(
        "flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent",
        "data-[active]:bg-accent"
      )}
    >
      {/* Avatar with live ring */}
      <div className="relative">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white">
          {trader.name?.charAt(0)?.toUpperCase() ?? "T"}
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-background" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{trader.name ?? "Trader"}</p>
        <div className="flex items-center gap-1.5">
          <Eye className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {Math.floor(Math.random() * 200 + 10)}
          </span>
          <span className={cn("text-xs font-medium", pnl >= 0 ? "text-green-500" : "text-red-500")}>
            {pnl >= 0 ? "+" : ""}{pnl.toFixed(1)}%
          </span>
        </div>
      </div>
    </Link>
  );
}
