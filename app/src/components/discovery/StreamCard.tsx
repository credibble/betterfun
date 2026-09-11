import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import type { TraderProfileSchema as Trader } from "@betterfun/shared";

type StreamCardProps = {
  trader: Trader;
  featured?: boolean;
};

export default function StreamCard({ trader, featured }: StreamCardProps) {
  const isLive = trader.isLive;
  const pnl = trader.pnl30 ?? 0;

  return (
    <Link
      to={isLive ? "/live/$id" : "/traders/$id"}
      params={{ id: trader.id }}
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card transition-all hover:shadow-lg hover:ring-2 hover:ring-primary/20",
        featured && "col-span-2 row-span-2"
      )}
    >
      {/* Thumbnail */}
      <div className={cn(
        "relative bg-gradient-to-br from-purple-900/50 to-blue-900/50",
        featured ? "aspect-video" : "aspect-video"
      )}>
        {isLive ? (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-lg font-bold text-white">
                  {trader.name?.charAt(0)?.toUpperCase() ?? "T"}
                </div>
              </div>
            </div>
            <Badge className="absolute top-2 left-2 bg-red-500 hover:bg-red-600 text-white text-[10px] h-5">
              LIVE
            </Badge>
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 rounded px-1.5 py-0.5">
              <Eye className="h-3 w-3 text-white" />
              <span className="text-[10px] text-white font-medium">
                {Math.floor(Math.random() * 500 + 20)}
              </span>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-50">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <span className="text-2xl font-bold text-muted-foreground">
                {trader.name?.charAt(0)?.toUpperCase() ?? "T"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start gap-2">
          <div className="relative flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white">
              {trader.name?.charAt(0)?.toUpperCase() ?? "T"}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("font-semibold truncate", featured ? "text-lg" : "text-sm")}>
              {trader.name ?? "Anonymous Trader"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {trader.traderType === "ai" ? "AI Trader" : "Human Trader"}
            </p>
          </div>
          <span className={cn("text-sm font-bold", pnl >= 0 ? "text-green-500" : "text-red-500")}>
            {pnl >= 0 ? "+" : ""}{pnl.toFixed(1)}%
          </span>
        </div>
      </div>
    </Link>
  );
}
