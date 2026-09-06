import { useState } from "react";
import { toast } from "sonner";
import { ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZE_PRESETS = [10, 25, 50, 100, 250];

type Side = "buy_up" | "buy_down" | "sell_up" | "sell_down";

interface OrderEntryProps {
  potId?: string;
  marketSymbol?: string;
  upPrice?: number;
  downPrice?: number;
  cash?: number;
  positions?: Array<{ side: string; contracts: number; avgPrice: number; marketId: string }>;
  isPending?: boolean;
  onSubmit: (input: { side: Side; sizeUsd: number; maxPrice?: number }) => void;
  className?: string;
}

export function OrderEntry({
  potId,
  marketSymbol,
  upPrice = 0.5,
  downPrice = 0.5,
  cash = 0,
  positions = [],
  isPending,
  onSubmit,
  className,
}: OrderEntryProps) {
  const [side, setSide] = useState<Side>("buy_up");
  const [sizeUsd, setSizeUsd] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState("");

  const isBuy = side.startsWith("buy");
  const isUp = side.includes("up");
  const currentPrice = isUp ? upPrice : downPrice;
  const hasPosition = positions.some(
    (p) => p.marketId === "" && p.side === (isUp ? "up" : "down") && p.contracts > 0,
  );

  const handleSubmit = () => {
    if (!potId) {
      toast.error("No tradable pot");
      return;
    }
    if (sizeUsd <= 0) {
      toast.error("Enter a size");
      return;
    }
    if (sizeUsd > cash) {
      toast.error("Insufficient cash");
      return;
    }
    onSubmit({
      side,
      sizeUsd,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });
    setSizeUsd(0);
    setMaxPrice("");
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Side toggle */}
      <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-secondary/30 p-1">
        <button
          type="button"
          onClick={() => setSide("buy_up")}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-md py-2.5 text-sm font-bold transition-all",
            side === "buy_up"
              ? "bg-up text-up-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ArrowUpRight className="h-4 w-4" />
          BUY UP
        </button>
        <button
          type="button"
          onClick={() => setSide("buy_down")}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-md py-2.5 text-sm font-bold transition-all",
            side === "buy_down"
              ? "bg-down text-down-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <ArrowDownRight className="h-4 w-4" />
          BUY DOWN
        </button>
      </div>

      {/* Current price */}
      <div className="flex items-center justify-between rounded-lg bg-secondary/20 px-3 py-2">
        <span className="text-xs text-muted-foreground">
          {isUp ? "UP" : "DOWN"} price
        </span>
        <span className={cn("text-sm font-bold tabular-nums", isUp ? "text-up" : "text-down")}>
          {currentPrice.toFixed(3)}
        </span>
      </div>

      {/* Size presets */}
      <div className="flex gap-1.5">
        {SIZE_PRESETS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setSizeUsd(v)}
            className={cn(
              "flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors",
              sizeUsd === v
                ? "bg-primary/15 text-primary"
                : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            ${v}
          </button>
        ))}
      </div>

      {/* Size input */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
        <input
          type="number"
          min={0}
          max={cash}
          value={sizeUsd || ""}
          placeholder="0"
          onChange={(e) => setSizeUsd(Math.max(0, Number(e.target.value) || 0))}
          className="w-full rounded-lg border border-border bg-secondary/40 py-2.5 pl-7 pr-3 text-sm font-bold tabular-nums outline-none placeholder:text-muted-foreground/50 focus:border-primary/50"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          of ${cash.toFixed(0)}
        </span>
      </div>

      {/* Max price (collapsible) */}
      <details className="group">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
          Set limit price
        </summary>
        <div className="mt-2">
          <input
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={maxPrice}
            placeholder={`${currentPrice.toFixed(2)} (market)`}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-primary/50"
          />
        </div>
      </details>

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || sizeUsd <= 0}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold shadow-sm transition-all duration-150 active:translate-y-[2px] disabled:opacity-50",
          isBuy
            ? "bg-up text-up-foreground hover:brightness-110"
            : "bg-down text-down-foreground hover:brightness-110",
        )}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            {isBuy ? "Buy" : "Sell"} {isUp ? "UP" : "DOWN"}
            {sizeUsd > 0 && <span className="opacity-80">${sizeUsd}</span>}
          </>
        )}
      </button>
    </div>
  );
}
