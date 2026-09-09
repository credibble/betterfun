import { useEffect, useRef, useState, useCallback } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Maximize, Minimize, Volume2, VolumeX, Radio } from "lucide-react";
import { useLiveKitToken } from "@/lib/queries";

type StreamPlayerProps = {
  traderId: string;
  traderName: string;
  isLive?: boolean;
  viewerCount?: number;
  className?: string;
};

type Status = "connecting" | "live" | "offline";

export default function StreamPlayer({
  traderId,
  traderName,
  isLive = false,
  viewerCount = 0,
  className,
}: StreamPlayerProps) {
  const tokenMutation = useLiveKitToken();
  const [status, setStatus] = useState<Status>(isLive ? "connecting" : "offline");
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Room | null>(null);
  const attemptedRef = useRef<string | null>(null);

  const room = traderId
    ? `stream-${traderId.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}`
    : "";

  useEffect(() => {
    if (!room || !isLive) {
      setStatus("offline");
      return;
    }
    if (attemptedRef.current === room) return;
    attemptedRef.current = room;
    setStatus("connecting");

    let cancelled = false;
    const detach = () => {
      containerRef.current?.querySelectorAll("video,audio").forEach((el) => el.remove());
    };

    const timeout = window.setTimeout(() => {
      if (!cancelled) setStatus("offline");
    }, 15_000);

    const connect = async () => {
      try {
        const { token, url } = await tokenMutation.mutateAsync(room);
        const r = new Room();
        roomRef.current = r;

        r.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
            const el = track.attach() as HTMLMediaElement;
            el.autoplay = true;
            el.setAttribute("playsinline", "");
            if (track.kind === Track.Kind.Audio) {
              el.muted = isMuted;
            }
            containerRef.current?.appendChild(el);
          }
        });
        r.on(RoomEvent.TrackUnsubscribed, () => detach());
        r.on(RoomEvent.Disconnected, () => {
          if (!cancelled) setStatus("offline");
        });

        await r.connect(url, token);
        window.clearTimeout(timeout);
        if (!cancelled) setStatus("live");
      } catch (err) {
        window.clearTimeout(timeout);
        if (!cancelled) setStatus("offline");
        console.warn("LiveKit connect failed", err);
      }
    };

    connect().catch(() => {
      window.clearTimeout(timeout);
      if (!cancelled) setStatus("offline");
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      roomRef.current?.disconnect();
      roomRef.current = null;
      attemptedRef.current = null;
      detach();
    };
  }, [room, isLive]);

  // Sync mute state
  useEffect(() => {
    containerRef.current?.querySelectorAll("audio").forEach((el) => {
      el.muted = isMuted;
    });
  }, [isMuted]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  return (
    <div className={cn("relative bg-black rounded-lg overflow-hidden", className)}>
      {/* Video container */}
      <div className="aspect-video relative">
        <div
          ref={containerRef}
          className="absolute inset-0 flex items-center justify-center [&>video]:h-full [&>video]:w-full [&>video]:object-contain"
        />

        {/* Offline / connecting overlay */}
        {status !== "live" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-br from-purple-900/80 to-blue-900/80">
            <div className="text-center">
              {status === "connecting" ? (
                <>
                  <div className="mx-auto h-12 w-12 rounded-full border-2 border-white/30 animate-ping border-primary" />
                  <p className="mt-3 text-sm font-medium text-white">Connecting to stream...</p>
                </>
              ) : (
                <>
                  <Radio className="h-12 w-12 mx-auto text-white/50 mb-2" />
                  <p className="text-white/70 text-sm">Stream is offline</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Live badge + viewer count */}
        {status === "live" && (
          <>
            <Badge className="absolute top-3 left-3 z-10 bg-red-500 hover:bg-red-600 text-white text-xs">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white mr-1.5" />
              LIVE
            </Badge>
            <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
              <div className="flex items-center gap-1 bg-black/60 rounded px-2 py-1">
                <span className="text-xs text-white font-medium">{viewerCount} viewers</span>
              </div>
            </div>
          </>
        )}

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 hover:opacity-100 transition-opacity">
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
