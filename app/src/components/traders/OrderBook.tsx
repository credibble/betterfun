import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface OrderBookProps {
  bids: Array<[number, number]>;
  asks: Array<[number, number]>;
  midPrice?: number;
  className?: string;
  depth?: number;
  onPriceClick?: (price: number, side: "bid" | "ask") => void;
}

export function OrderBook({ bids, asks, midPrice, className, depth = 8, onPriceClick }: OrderBookProps) {
  const displayAsks = useMemo(() => {
    const sliced = asks.slice(0, depth).reverse();
    const maxVol = Math.max(...sliced.map(([, v]) => v), 0.01);
    return sliced.map(([price, vol]) => ({ price, vol, pct: (vol / maxVol) * 100 }));
  }, [asks, depth]);

  const displayBids = useMemo(() => {
    const sliced = bids.slice(0, depth);
    const maxVol = Math.max(...sliced.map(([, v]) => v), 0.01);
    return sliced.map(([price, vol]) => ({ price, vol, pct: (vol / maxVol) * 100 }));
  }, [bids, depth]);

  const bestBid = bids[0]?.[0];
  const bestAsk = asks[0]?.[0];
  const spread = bestBid != null && bestAsk != null ? bestAsk - bestBid : null;

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      <div className="mb-1 flex items-center justify-between px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Price</span>
        <span>Size</span>
      </div>

      {/* Asks (sells) — red, stacked bottom-up */}
      <div className="flex-1 space-y-px overflow-hidden">
        {displayAsks.map(({ price, vol, pct }, i) => (
          <button
            key={`ask-${i}`}
            type="button"
            onClick={() => onPriceClick?.(price, "ask")}
            className="group relative flex w-full items-center justify-between px-2 py-0.5 text-xs tabular-nums transition-colors hover:bg-down/10"
          >
            <span className="absolute bottom-0 right-0 top-0 bg-down/8 transition-all" style={{ width: `${pct}%` }} />
            <span className="relative font-medium text-down">{price.toFixed(3)}</span>
            <span className="relative text-muted-foreground">{vol.toFixed(2)}</span>
          </button>
        ))}
      </div>

      {/* Spread / mid */}
      <div className="my-1 flex items-center justify-center gap-2 border-y border-border/50 px-2 py-1">
        <span className="text-xs font-bold tabular-nums text-foreground">
          {midPrice != null ? midPrice.toFixed(3) : bestBid != null && bestAsk != null ? ((bestBid + bestAsk) / 2).toFixed(3) : "—"}
        </span>
        {spread != null && (
          <span className="rounded bg-secondary/60 px-1 py-0.5 text-[10px] text-muted-foreground">
            Spread {(spread * 100).toFixed(1)}¢
          </span>
        )}
      </div>

      {/* Bids (buys) — green */}
      <div className="flex-1 space-y-px overflow-hidden">
        {displayBids.map(({ price, vol, pct }, i) => (
          <button
            key={`bid-${i}`}
            type="button"
            onClick={() => onPriceClick?.(price, "bid")}
            className="group relative flex w-full items-center justify-between px-2 py-0.5 text-xs tabular-nums transition-colors hover:bg-up/10"
          >
            <span className="absolute bottom-0 right-0 top-0 bg-up/8 transition-all" style={{ width: `${pct}%` }} />
            <span className="relative font-medium text-up">{price.toFixed(3)}</span>
            <span className="relative text-muted-foreground">{vol.toFixed(2)}</span>
          </button>
        ))}
      </div>

      {bids.length === 0 && asks.length === 0 && (
        <div className="py-6 text-center text-xs text-muted-foreground">No orders</div>
      )}
    </div>
  );
}
