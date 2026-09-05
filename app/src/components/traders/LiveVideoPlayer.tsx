import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";
import { useLiveKitToken } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Status = "connecting" | "live" | "offline";

/**
 * Joins a LiveKit room and renders the published (ingress/RTMP) participant's
 * video + audio tracks — the actual OBS stream, not a mock chart.
 */
export function LiveVideoPlayer({ room, className }: { room: string; className?: string }) {
  const tokenMutation = useLiveKitToken();
  const [status, setStatus] = useState<Status>("connecting");
  const containerRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Room | null>(null);
  const attemptedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!room) {
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

    // Don't hang on "Connecting" forever if the room is unreachable.
    const timeout = window.setTimeout(() => {
      if (!cancelled) setStatus("offline");
    }, 15_000);

    const connect = async () => {
      const { token, url } = await tokenMutation.mutateAsync(room);
      const r = new Room();
      roomRef.current = r;

      r.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
          const el = track.attach() as HTMLMediaElement;
          el.autoplay = true;
          el.setAttribute("playsinline", "");
          el.setAttribute("controls", "");
          el.muted = true; // start muted so autoplay isn't blocked; unmute via controls
          containerRef.current?.appendChild(el);
        }
      });
      r.on(RoomEvent.TrackUnsubscribed, () => detach());
      r.on(RoomEvent.Disconnected, () => {
        if (!cancelled) setStatus("offline");
      });

      try {
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
      attemptedRef.current = null; // allow a retry (e.g. Strict Mode remount)
      detach();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-black",
        className,
      )}
    >
      <div ref={containerRef} className="flex h-full w-full items-center justify-center [&>video]:h-full [&>video]:w-full [&>video]:object-contain" />

      {status !== "live" && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-background/80">
          <div className="text-center">
            <div
              className={cn(
                "mx-auto h-8 w-8 rounded-full border-2 border-muted",
                status === "connecting" && "animate-ping border-primary",
                status === "offline" && "border-muted-foreground/40",
              )}
            />
            <p className="mt-3 text-sm font-medium text-foreground">
              {status === "connecting" ? "Connecting to stream…" : "Stream is offline"}
            </p>
          </div>
        </div>
      )}

      {status === "live" && (
        <span className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-down px-2.5 py-1 text-xs font-bold uppercase text-down-foreground">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-down-foreground" /> Live
        </span>
      )}
    </div>
  );
}