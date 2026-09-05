import { useEffect, useRef, useState } from "react";
import { ImagePlus, Send, Smile, Wifi, WifiOff } from "lucide-react";
import { EmojiPickerPopover } from "@/components/market/EmojiPickerPopover";
import { GifPickerDialog } from "@/components/market/GifPickerDialog";
import { gifUrl, type GifItem } from "@/lib/market-comments-data";
import { cn } from "@/lib/utils";
import { useMe } from "@/lib/queries";

type Msg = {
  id: number;
  user: string;
  hue: number;
  text: string;
  gif?: string;
  isSystem?: boolean;
};

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const WS_BASE = API_BASE.replace(/^http/, "ws");

let nextId = 1;

function identityHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
}

export function LiveChat({ room = "global", className }: { room?: string; className?: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [pendingGif, setPendingGif] = useState<GifItem | null>(null);
  const [connected, setConnected] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { data: me } = useMe();
  const identityRef = useRef(me?.walletAddress ?? "anonymous");

  useEffect(() => {
    identityRef.current = me?.walletAddress ?? "anonymous";
  }, [me]);

  useEffect(() => {
    const identity = identityRef.current;
    const url = `${WS_BASE}/ws/chat?room=${encodeURIComponent(room)}&identity=${encodeURIComponent(identity)}`;

    let disposed = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: number | undefined;
    let connectTimeout: number | undefined;

    const teardown = () => {
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (connectTimeout) window.clearTimeout(connectTimeout);
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
        ws = null;
      }
    };

    const connect = () => {
      if (disposed) return;

      ws = new WebSocket(url);
      const w = ws;
      wsRef.current = w;

      // A socket stuck in CONNECTING is closed and retried, never stuck forever.
      connectTimeout = window.setTimeout(() => {
        if (w.readyState === WebSocket.CONNECTING) {
          w.close();
          setConnected(false);
        }
      }, 8000);

      w.onopen = () => {
        if (disposed) return;
        if (connectTimeout) window.clearTimeout(connectTimeout);
        setConnected(true);
      };

      w.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "chat") {
            setMsgs((prev) => [
              ...prev.slice(-60),
              {
                id: nextId++,
                user: data.identity,
                hue: identityHash(data.identity),
                text: data.message ?? "",
              },
            ]);
          } else if (data.type === "system") {
            setMsgs((prev) => [
              ...prev.slice(-60),
              {
                id: nextId++,
                user: "system",
                hue: 0,
                text: data.message,
                isSystem: true,
              },
            ]);
          }
        } catch {
          // ignore malformed messages
        }
      };

      w.onclose = () => {
        if (disposed) return;
        setConnected(false);
        reconnectTimer = window.setTimeout(connect, 3000);
      };

      w.onerror = () => w.close();
    };

    connect();

    return () => {
      disposed = true;
      teardown();
    };
  }, [room]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [msgs]);

  const send = () => {
    const text = draft.trim();
    if (!text && !pendingGif) return;
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ message: text || (pendingGif ? pendingGif.title : "") }));
    }
    setDraft("");
    setPendingGif(null);
  };

  return (
    <div className={cn("flex flex-col rounded-xl border border-border bg-card", className)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-semibold">Live chat</span>
        <div className="flex items-center gap-2">
          {connected ? (
            <Wifi className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground">{msgs.length} messages</span>
        </div>
      </div>
      <div ref={scroller} className="scroll-thin flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
        {msgs.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {connected ? "No messages yet. Say something!" : "Connecting..."}
          </p>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={cn("flex items-start gap-2 text-sm", m.isSystem && "justify-center")}>
            {m.isSystem ? (
              <span className="text-xs text-muted-foreground italic">{m.text}</span>
            ) : (
              <>
                <span
                  className="mt-0.5 h-5 w-5 shrink-0 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, hsl(${m.hue} 80% 55%), hsl(${(m.hue + 40) % 360} 80% 45%))`,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="leading-snug">
                    <span
                      className={cn(
                        "font-semibold",
                        m.user === identityRef.current ? "text-primary" : "text-foreground/80",
                      )}
                    >
                      {m.user}
                    </span>{" "}
                    {m.text && <span className="text-foreground/90">{m.text}</span>}
                  </p>
                  {m.gif && (
                    <img
                      src={gifUrl(m.gif)}
                      alt=""
                      className="mt-1.5 max-h-28 rounded-lg border border-border object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-border p-3">
        {pendingGif && (
          <div className="relative mb-2 inline-block overflow-hidden rounded-lg border border-border">
            <img
              src={gifUrl(pendingGif.url)}
              alt={pendingGif.title}
              className="h-16 w-auto object-cover"
            />
            <button
              type="button"
              onClick={() => setPendingGif(null)}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-background/90 text-xs font-bold text-foreground shadow"
              aria-label="Remove GIF"
            >
              ×
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={connected ? "Say something..." : "Connecting..."}
            disabled={!connected}
            className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50 disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={!connected}
            aria-label="Send message"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <EmojiPickerPopover
            open={emojiOpen}
            onOpenChange={setEmojiOpen}
            onSelect={(emoji) => setDraft((d) => d + emoji)}
          >
            <button
              type="button"
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                emojiOpen
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
              aria-label="Add emoji"
            >
              <Smile className="h-4 w-4" />
            </button>
          </EmojiPickerPopover>
          <button
            type="button"
            onClick={() => setGifOpen(true)}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              gifOpen || pendingGif
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
            aria-label="Add GIF"
          >
            <ImagePlus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <GifPickerDialog
        open={gifOpen}
        onOpenChange={setGifOpen}
        onSelect={(gif) => setPendingGif(gif)}
      />
    </div>
  );
}
