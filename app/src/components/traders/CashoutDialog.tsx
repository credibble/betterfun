import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, DollarSign, Loader2 } from "lucide-react";

interface Position {
  id: string;
  marketId: string;
  symbol?: string;
  side: string;
  contracts: number;
  avgPrice: number;
  status: string;
  realizedPnl?: number;
  win?: boolean;
}

interface CashoutDialogProps {
  position: Position | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCashout: (marketId: string, side: "sell_up" | "sell_down", sizeUsd: number) => Promise<void>;
  currentPrice?: number;
}

const SIZE_PRESETS = [25, 50, 75, 100];

export function CashoutDialog({
  position,
  open,
  onOpenChange,
  onCashout,
  currentPrice,
}: CashoutDialogProps) {
  const [sizeUsd, setSizeUsd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!position) return null;

  const isUp = position.side === "up";
  // Max sellable is the number of contracts held (not USD value)
  const maxSize = position.contracts;
  const amount = parseFloat(sizeUsd) || 0;
  const exceeds = amount > maxSize && maxSize > 0;
  const invalid = amount <= 0 || exceeds;

  // Estimated USDC received = contracts * price per contract
  const estimatedReceive =
    currentPrice != null && amount > 0
      ? amount * currentPrice
      : null;

  const handlePreset = (pct: number) => {
    const val = Math.min(maxSize, maxSize * (pct / 100));
    setSizeUsd(val > 0 ? val.toFixed(2) : "");
  };

  const handleCashout = async () => {
    if (invalid || !sizeUsd) return;
    setLoading(true);
    setError("");
    try {
      const side = isUp ? "sell_up" : "sell_down";
      await onCashout(position.marketId, side, amount);
      setSizeUsd("");
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Cashout failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Cashout Position
          </DialogTitle>
        </DialogHeader>

        {/* Position info */}
        <div className="rounded-lg border border-border bg-secondary/30 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{position.symbol ?? "Unknown"}</span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-bold uppercase",
                isUp ? "bg-up/15 text-up" : "bg-down/15 text-down",
              )}
            >
              {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {position.side}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Size</span>
              <p className="font-semibold tabular-nums">{position.contracts.toFixed(2)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Avg Price</span>
              <p className="font-semibold tabular-nums">{position.avgPrice.toFixed(3)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Current</span>
              <p className="font-semibold tabular-nums">
                {currentPrice != null ? currentPrice.toFixed(3) : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Amount input */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            Cashout amount (contracts)
          </label>
          <Input
            type="number"
            placeholder="0.00"
            value={sizeUsd}
            onChange={(e) => {
              setSizeUsd(e.target.value);
              setError("");
            }}
            max={maxSize}
            min={0}
            step={0.01}
            className="text-sm tabular-nums"
          />
          <div className="mt-1.5 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">
              Available: {maxSize.toFixed(2)} contracts
            </span>
            {estimatedReceive != null && (
              <span className="text-muted-foreground">
                ≈ ${estimatedReceive.toFixed(2)} USDC
              </span>
            )}
          </div>
        </div>

        {/* Presets */}
        <div className="flex gap-1.5">
          {SIZE_PRESETS.map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => handlePreset(pct)}
              className={cn(
                "flex-1 rounded-md border border-border bg-secondary/40 py-1.5 text-xs font-semibold transition-colors hover:bg-secondary/70",
                amount === Math.min(maxSize, maxSize * (pct / 100)) && "border-primary/50 bg-primary/10 text-primary",
              )}
            >
              {pct === 100 ? "All" : `${pct}%`}
            </button>
          ))}
        </div>

        {error && (
          <p className="text-xs text-down">{error}</p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCashout}
            disabled={invalid || loading}
            className={cn(
              "min-w-[120px]",
              isUp
                ? "bg-up text-white hover:bg-up/90"
                : "bg-down text-white hover:bg-down/90",
            )}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              `Cashout ${isUp ? "UP" : "DOWN"}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
