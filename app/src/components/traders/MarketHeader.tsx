import { useEffect, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { cn } from "@/lib/utils";
import { Clock, Zap } from "lucide-react";

interface MarketHeaderProps {
  symbol?: string;
  upPrice?: number;
  downPrice?: number;
  expiry?: string;
  status?: string;
  volume?: number;
  className?: string;
}

function parseExpiryMs(expiry: string): number {
  const ts = Number(expiry);
  if (!isNaN(ts)) return ts < 1e12 ? ts * 1000 : ts;
  const ms = new Date(expiry).getTime();
  return isNaN(ms) ? 0 : ms;
}

function Countdown({ expiry }: { expiry: string }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const expiryMs = parseExpiryMs(expiry);
    const tick = () => {
      const diff = expiryMs - Date.now();
      if (diff <= 0) {
        setRemaining("Expired");
        return;
      }
      setRemaining(formatDistanceToNowStrict(expiryMs, { addSuffix: false }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiry]);

  return <>{remaining}</>;
}

export function MarketHeader({
  symbol,
  upPrice = 0.5,
  downPrice = 0.5,
  expiry,
  status,
  volume,
  className,
}: MarketHeaderProps) {
  const isTrading = status === "trading";

  return (
    <div className={cn("flex items-center gap-4", className)}>
      {/* Symbol */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-base font-bold">{symbol ?? "Select market"}</h3>
          {isTrading && (
            <span className="flex items-center gap-1 rounded bg-up/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-up">
              <Zap className="h-2.5 w-2.5" /> Live
            </span>
          )}
        </div>
      </div>

      {/* Prices */}
      <div className="flex items-center gap-3">
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Up</p>
          <p className="text-lg font-bold tabular-nums text-up">{upPrice.toFixed(3)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Down</p>
          <p className="text-lg font-bold tabular-nums text-down">{downPrice.toFixed(3)}</p>
        </div>
      </div>

      {/* Expiry */}
      {expiry && (
        <div className="ml-auto flex items-center gap-1.5 rounded-lg bg-secondary/40 px-3 py-1.5 text-xs">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-semibold tabular-nums text-foreground">
            <Countdown expiry={expiry} />
          </span>
        </div>
      )}

      {/* Volume */}
      {volume != null && volume > 0 && (
        <div className="text-right text-xs text-muted-foreground">
          Vol <span className="font-semibold text-foreground">${volume.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}
