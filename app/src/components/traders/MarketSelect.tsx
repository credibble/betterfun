import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { ChevronDown, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

function parseExpiryMs(expiry: string): number {
  const ts = Number(expiry);
  if (!isNaN(ts)) return ts < 1e12 ? ts * 1000 : ts;
  const ms = new Date(expiry).getTime();
  return isNaN(ms) ? 0 : ms;
}

function formatExpiry(expiry?: string): string {
  if (!expiry) return "";
  const ms = parseExpiryMs(expiry);
  return ms > 0 ? format(ms, "h:mm a") : "";
}

interface Market {
  id: string;
  symbol: string;
  upPrice: number;
  downPrice: number;
  volume?: number;
  expiry?: string;
}

interface MarketSelectProps {
  markets: Market[];
  value: string;
  onChange: (marketId: string) => void;
  className?: string;
}

export function MarketSelect({ markets, value, onChange, className }: MarketSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = markets.find((m) => m.id === value);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-left text-sm outline-none transition-colors hover:bg-secondary/60 focus:border-primary/50"
      >
        {selected ? (
          <>
            <span className="flex-1 truncate font-semibold">{selected.symbol}</span>
            <span className="flex items-center gap-2 text-xs">
              <span className="rounded bg-up/15 px-1.5 py-0.5 font-bold text-up">
                UP {selected.upPrice.toFixed(2)}
              </span>
              <span className="rounded bg-down/15 px-1.5 py-0.5 font-bold text-down">
                DN {selected.downPrice.toFixed(2)}
              </span>
            </span>
          </>
        ) : (
          <span className="flex-1 text-muted-foreground">Select a live market</span>
        )}
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
          <div className="max-h-64 overflow-y-auto p-1">
            {markets.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">No live markets</div>
            )}
            {markets.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onChange(m.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors",
                  m.id === value ? "bg-primary/10 text-foreground" : "hover:bg-secondary/60",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{m.symbol}</span>
                    <span className="flex items-center gap-0.5 rounded bg-up/15 px-1 py-0.5 text-[10px] font-bold text-up">
                      <Zap className="h-2.5 w-2.5" /> Live
                    </span>
                  </div>
                  {m.expiry && formatExpiry(m.expiry) && (
                    <span className="text-[11px] text-muted-foreground">
                      Expires {formatExpiry(m.expiry)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="rounded bg-up/10 px-1.5 py-0.5 text-xs font-bold tabular-nums text-up">
                    {m.upPrice.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">/</span>
                  <span className="rounded bg-down/10 px-1.5 py-0.5 text-xs font-bold tabular-nums text-down">
                    {m.downPrice.toFixed(2)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
