import { useTradeSignals } from "./use-trade-signals";
import { usePositions } from "@/lib/queries";

type OverlayPosition = {
  marketId: string;
  title: string;
  side: "up" | "down";
  size: number;
  currentPnl: number;
};

export function useStreamOverlay(potId: string, traderId: string) {
  const { signals, latest } = useTradeSignals(potId);
  const { data: rawPositions = [] } = usePositions(traderId);

  const positions: OverlayPosition[] = rawPositions.map((p: Record<string, unknown>) => ({
    marketId: (p.marketId ?? p.market_id ?? "") as string,
    title: (p.title ?? p.marketTitle ?? "Market") as string,
    side: (p.side === "down" ? "down" : "up") as "up" | "down",
    size: Number(p.size ?? p.amount ?? 0),
    currentPnl: Number(p.currentPnl ?? p.pnl ?? 0),
  }));

  const pnl = 0;

  return { positions, pnl, latest, signals };
}
