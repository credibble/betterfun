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

  const positions: OverlayPosition[] = rawPositions.map((p) => ({
    marketId: p.marketId,
    title: p.marketId,
    side: p.side,
    size: p.contracts,
    currentPnl: p.realizedPnl,
  }));

  const pnl = 0;

  return { positions, pnl, latest, signals };
}
