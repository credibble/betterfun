import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { parseMarketSymbol } from "@/lib/market-utils";
import { ProbabilityBar } from "./ProbabilityBar";
import { ArrowUpRight, ArrowDownRight, Loader2, Zap } from "lucide-react";

type Side = "buy_up" | "buy_down";

interface TradePanelProps {
  symbol: string;
  question?: string;
  upPrice: number;
  downPrice: number;
  cash?: number;
  isPending?: boolean;
  onSubmit: (input: { side: Side; sizeUsd: number; maxPrice?: number }) => void;
  className?: string;
}

const SIZE_PRESETS = [10, 25, 50, 100, 250];

export function TradePanel({
  symbol,
  question,
  upPrice,
  downPrice,
  cash = 0,
  isPending,
  onSubmit,
  className,
}: TradePanelProps) {
  const [side, setSide] = useState<Side>("buy_up");
  const [sizeUsd, setSizeUsd] = useState(0);

  const parsed = parseMarketSymbol(symbol);
  const displayQuestion = question || parsed?.question || symbol;
  const displayAsset = parsed?.asset || symbol?.split("-")[0] || "—";
  const isYes = side === "buy_up";
  const currentPrice = isYes ? upPrice : downPrice;

  const handleSubmit = () => {
    if (sizeUsd <= 0) {
      toast.error("Enter an amount");
      return;
    }
    if (sizeUsd > cash) {
      toast.error("Insufficient cash");
      return;
    }
    onSubmit({
      side,
      sizeUsd,
    });
    setSizeUsd(0);
  };

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      {/* Question */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-secondary/60 px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
            {displayAsset}
          </span>
          <span className="flex items-center gap-0.5 rounded bg-up/15 px-1 py-0.5 text-[9px] font-bold text-up">
            <Zap className="h-2 w-2" /> Live
          </span>
        </div>
        <h3 className="mt-2 text-sm font-bold leading-tight text-foreground">
          {displayQuestion}
        </h3>
      </div>

      {/* Probability bar */}
      <ProbabilityBar
        yesPercent={upPrice * 100}
        noPercent={downPrice * 100}
        size="sm"
      />

      {/* Side toggle */}
      <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-lg bg-secondary/30 p-1">
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
          YES {upPrice.toFixed(2)}
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
          NO {downPrice.toFixed(2)}
        </button>
      </div>

      {/* Size presets */}
      <div className="mt-3 flex gap-1.5">
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

      {/* Amount input */}
      <div className="relative mt-3">
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

      {/* Cost preview */}
      {sizeUsd > 0 && (
        <div className="mt-2 rounded-lg bg-secondary/30 p-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">You pay</span>
            <span className="font-semibold">${sizeUsd.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">You get</span>
            <span className="font-semibold">
              {(sizeUsd / currentPrice).toFixed(1)} shares @ {(currentPrice * 100).toFixed(0)}¢
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Potential payout</span>
            <span className="font-semibold text-up">
              ${(sizeUsd / currentPrice).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || sizeUsd <= 0 || sizeUsd > cash}
        className={cn(
          "mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold shadow-sm transition-all duration-150 active:translate-y-[2px] disabled:opacity-50",
          isYes
            ? "bg-up text-up-foreground hover:brightness-110"
            : "bg-down text-down-foreground hover:brightness-110",
        )}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Buy {isYes ? "YES" : "NO"}
            {sizeUsd > 0 && <span className="opacity-80">${sizeUsd}</span>}
          </>
        )}
      </button>
    </div>
  );
}
