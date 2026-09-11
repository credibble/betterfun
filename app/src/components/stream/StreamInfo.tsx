import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Share2, Bell, Users } from "lucide-react";
import type { TraderView as Trader } from "@/lib/types";

type StreamInfoProps = {
  trader: Trader;
  viewerCount?: number;
  onFollow?: () => void;
  isFollowing?: boolean;
  className?: string;
};

export default function StreamInfo({
  trader,
  viewerCount = 0,
  onFollow,
  isFollowing = false,
  className,
}: StreamInfoProps) {
  const pnl = trader.pnl30 ?? 0;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-lg font-bold text-white">
              {trader.name?.charAt(0)?.toUpperCase() ?? "T"}
            </div>
            {trader.isLive && (
              <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-background" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold">{trader.name ?? "Anonymous Trader"}</h1>
            <p className="text-sm text-muted-foreground">
              {trader.traderType === "ai" ? "AI Trader" : "Human Trader"}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <span className={cn("text-sm font-bold", pnl >= 0 ? "text-green-500" : "text-red-500")}>
                {pnl >= 0 ? "+" : ""}{pnl.toFixed(1)}%
              </span>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {viewerCount}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onFollow && (
            <Button
              variant={isFollowing ? "outline" : "default"}
              size="sm"
              onClick={onFollow}
            >
              <Heart className={cn("h-4 w-4 mr-1", isFollowing && "fill-current")} />
              {isFollowing ? "Following" : "Follow"}
            </Button>
          )}
          <Button variant="outline" size="icon" className="h-9 w-9">
            <Bell className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {trader.bio && (
        <p className="text-sm text-muted-foreground">{trader.bio}</p>
      )}

      {trader.tags && trader.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {trader.tags.map((tag: string) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
