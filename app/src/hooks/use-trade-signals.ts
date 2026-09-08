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

    const unsub = wsClient.on("trade_signal", (msg: any) => {
      if (msg.channel !== channel && msg.potId !== potId) return;

      const signal: TradeSignal = {
        id: msg.id,
        type: "trade_signal",
        trader: msg.trader ?? "Trader",
        potId: msg.potId ?? potId,
        side: msg.side,
        marketId: msg.marketId,
        marketTitle: msg.marketTitle,
        price: msg.price,
        size: msg.size,
        timestamp: msg.timestamp ?? Date.now(),
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
