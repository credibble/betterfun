import { useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Minus, LogOut } from "lucide-react";
import { CashoutDialog } from "./CashoutDialog";

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

interface PositionTableProps {
  positions: Position[];
  currentPrices?: Record<string, { up: number; down: number }>;
  onCashout?: (marketId: string, side: "sell_up" | "sell_down", sizeUsd: number) => Promise<void>;
  className?: string;
}

export function PositionTable({ positions, currentPrices = {}, onCashout, className }: PositionTableProps) {
  const open = positions.filter((p) => p.status === "open");
  const [cashoutPos, setCashoutPos] = useState<Position | null>(null);

  if (open.length === 0) {
    return (
      <div className={cn("py-6 text-center text-sm text-muted-foreground", className)}>
        No open positions
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="pb-2 pr-3 text-left">Market</th>
            <th className="pb-2 pr-3 text-left">Side</th>
            <th className="pb-2 pr-3 text-right">Size</th>
            <th className="pb-2 pr-3 text-right">Avg Price</th>
            <th className="pb-2 pr-3 text-right">Current</th>
            <th className="pb-2 pr-3 text-right">P&L</th>
            <th className="pb-2 text-right"></th>
          </tr>
        </thead>
        <tbody>
          {open.map((pos) => {
            const isUp = pos.side === "up";
            const current = currentPrices[pos.marketId]?.[isUp ? "up" : "down"];
            const unrealizedPnl =
              current != null ? (current - pos.avgPrice) * pos.contracts : null;
            const returnPct =
              current != null && pos.avgPrice > 0
                ? ((current - pos.avgPrice) / pos.avgPrice) * 100
                : null;

            return (
              <tr key={pos.id} className="border-b border-border/50">
                <td className="py-2.5 pr-3">
                  <span className="truncate font-semibold">{pos.symbol ?? "Unknown"}</span>
                </td>
                <td className="py-2.5 pr-3">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-bold uppercase",
                      isUp ? "bg-up/15 text-up" : "bg-down/15 text-down",
                    )}
                  >
                    {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {pos.side}
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums">{pos.contracts.toFixed(2)}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums">{pos.avgPrice.toFixed(3)}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums">
                  {current != null ? current.toFixed(3) : "—"}
                </td>
                <td className="py-2.5 text-right">
                  {unrealizedPnl != null ? (
                    <span
                      className={cn(
                        "tabular-nums font-semibold",
                        unrealizedPnl > 0 ? "text-up" : unrealizedPnl < 0 ? "text-down" : "text-muted-foreground",
                      )}
                    >
                      {unrealizedPnl > 0 ? "+" : ""}
                      {unrealizedPnl.toFixed(2)}
                      {returnPct != null && (
                        <span className="ml-1 text-[11px] opacity-70">
                          ({returnPct > 0 ? "+" : ""}
                          {returnPct.toFixed(1)}%)
                        </span>
                      )}
                    </span>
                  ) : (
                    <Minus className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </td>
                <td className="py-2.5 pl-2 text-right">
                  {onCashout && (
                    <button
                      type="button"
                      onClick={() => setCashoutPos(pos)}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/40 px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
                    >
                      <LogOut className="h-3 w-3" />
                      Cashout
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <CashoutDialog
        position={cashoutPos}
        open={cashoutPos != null}
        onOpenChange={(v) => !v && setCashoutPos(null)}
        onCashout={onCashout ?? (async () => {})}
        currentPrice={
          cashoutPos
            ? currentPrices[cashoutPos.marketId]?.[cashoutPos.side === "up" ? "up" : "down"]
            : undefined
        }
      />
    </div>
  );
}
