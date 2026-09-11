import { useState, useEffect } from "react";
import { wsClient } from "@/lib/ws-client";

type TradeSignal = {
  id?: string;
  type: "trade_signal";
  trader: string;
  potId: string;
  side: "buy_up" | "buy_down" | "sell";
  marketId?: string;
  marketTitle?: string;
  price?: number;
  size?: number;
  timestamp: number;
};

export function useTradeSignals(potId: string) {
  const [signals, setSignals] = useState<TradeSignal[]>([]);
  const [latest, setLatest] = useState<TradeSignal | null>(null);

  useEffect(() => {
    if (!potId) return;

    const channel = `pot:${potId}`;
    wsClient.send({ type: "subscribe", channel });

    const unsub = wsClient.on("trade_signal", (msg: Record<string, unknown>) => {
      if (msg.channel !== channel && msg.potId !== potId) return;

      const signal: TradeSignal = {
        id: String(msg.id ?? ""),
        type: "trade_signal",
        trader: String(msg.trader ?? "Trader"),
        potId: String(msg.potId ?? potId),
        side: msg.side as TradeSignal["side"],
        marketId: msg.marketId as string | undefined,
        marketTitle: msg.marketTitle as string | undefined,
        price: msg.price as number | undefined,
        size: msg.size as number | undefined,
        timestamp: Number(msg.timestamp ?? Date.now()),
      };

      setSignals((prev) => [...prev.slice(-50), signal]);
      setLatest(signal);
    });

    return () => {
      unsub();
      wsClient.send({ type: "unsubscribe", channel });
    };
  }, [potId]);

  return { signals, latest };
}
