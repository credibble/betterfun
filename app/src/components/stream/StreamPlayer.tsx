import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Maximize, Minimize, Volume2, VolumeX, Radio } from "lucide-react";

type StreamPlayerProps = {
  traderId: string;
  traderName: string;
  isLive?: boolean;
  viewerCount?: number;
  className?: string;
};

export default function StreamPlayer({
  traderId,
  traderName,
  isLive = false,
  viewerCount = 0,
  className,
}: StreamPlayerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "failed">("connecting");

  useEffect(() => {
    if (isLive) {
      const timer = setTimeout(() => setConnectionState("connected"), 2000);
      return () => clearTimeout(timer);
    }
  }, [isLive]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  return (
    <div className={cn("relative bg-black rounded-lg overflow-hidden", className)}>
      {/* Video Area */}
      <div className="aspect-video relative">
        {isLive ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/80 to-blue-900/80">
            <div className="text-center">
              <div className="h-24 w-24 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl font-bold text-white mb-4">
                {traderName?.charAt(0)?.toUpperCase() ?? "T"}
              </div>
              <p className="text-white/80 text-sm">{traderName}</p>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="text-center">
              <Radio className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Stream is offline</p>
            </div>
          </div>
        )}

        {/* Overlays */}
        {isLive && (
          <>
            <Badge className="absolute top-3 left-3 bg-red-500 hover:bg-red-600 text-white text-xs">
              LIVE
            </Badge>
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <div className="flex items-center gap-1 bg-black/60 rounded px-2 py-1">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-white font-medium">{viewerCount} viewers</span>
              </div>
            </div>
          </>
        )}

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 hover:opacity-100 transition-opacity">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
