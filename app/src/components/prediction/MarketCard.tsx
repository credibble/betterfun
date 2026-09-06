import { cn } from "@/lib/utils";
import { ProbabilityBar } from "./ProbabilityBar";
import { OutcomeButton } from "./OutcomeButton";
import { AITradeBadge } from "./AITradeBadge";
import { parseMarketSymbol, formatTimeRemaining, formatVolume } from "@/lib/market-utils";
import { Clock, TrendingUp, Zap } from "lucide-react";

interface MarketCardProps {
  symbol: string;
  question?: string;
  strike?: string;
  expiryMs?: number;
  upPrice: number;
  downPrice: number;
  volume?: number;
  status?: string;
  aiTrade?: { side: string; amount: number } | null;
  onClick?: () => void;
  onBuyYes?: () => void;
  onBuyNo?: () => void;
  compact?: boolean;
  className?: string;
}

export function MarketCard({
  symbol,
  question,
  strike,
  expiryMs,
  upPrice,
  downPrice,
  volume = 0,
  status,
  aiTrade,
  onClick,
  onBuyYes,
  onBuyNo,
  compact = false,
  className,
}: MarketCardProps) {
  const parsed = parseMarketSymbol(symbol);

  const displayQuestion = question || parsed?.question || symbol;
  const displayAsset = parsed?.asset || symbol?.split("-")[0] || "—";
  const expiry = expiryMs ? new Date(expiryMs) : parsed?.expiry ?? null;
  const isActive = status === "trading";

  const yesPct = upPrice * 100;
  const noPct = downPrice * 100;

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary/30 hover:shadow-md",
          className,
        )}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                {displayAsset}
              </span>
              {isActive && (
                <span className="flex items-center gap-0.5 rounded bg-up/15 px-1 py-0.5 text-[9px] font-bold text-up">
                  <Zap className="h-2 w-2" /> Live
                </span>
              )}
            </div>
            <p className="mt-1 text-sm font-bold leading-tight text-foreground">
              {displayQuestion}
            </p>
          </div>
          {aiTrade && (
            <AITradeBadge side={aiTrade.side} amount={aiTrade.amount} />
          )}
        </div>

        <ProbabilityBar yesPercent={yesPct} noPercent={noPct} size="sm" />

        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{formatVolume(volume)} Vol</span>
          {expiry && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {formatTimeRemaining(expiry)}
            </span>
          )}
        </div>
      </button>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded bg-secondary/60 px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
              {displayAsset}
            </span>
            {isActive && (
              <span className="flex items-center gap-0.5 rounded bg-up/15 px-1.5 py-0.5 text-[10px] font-bold text-up">
                <Zap className="h-2.5 w-2.5" /> Live
              </span>
            )}
          </div>
          <h3 className="mt-2 text-base font-bold leading-tight text-foreground">
            {displayQuestion}
          </h3>
        </div>
        {aiTrade && (
          <AITradeBadge side={aiTrade.side} amount={aiTrade.amount} size="md" />
        )}
      </div>

      {/* Probability bar */}
      <ProbabilityBar yesPercent={yesPct} noPercent={noPct} size="md" />

      {/* Meta row */}
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          {formatVolume(volume)} vol
        </span>
        {expiry && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTimeRemaining(expiry)}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <OutcomeButton
          outcome="yes"
          price={upPrice}
          onClick={(e) => {
            e?.stopPropagation();
            onBuyYes?.();
          }}
          disabled={!isActive}
          size="md"
        />
        <OutcomeButton
          outcome="no"
          price={downPrice}
          onClick={(e) => {
            e?.stopPropagation();
            onBuyNo?.();
          }}
          disabled={!isActive}
          size="md"
        />
      </div>
    </div>
  );
}
