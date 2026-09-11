import { useState, useEffect, useCallback } from "react";
import { wsClient } from "@/lib/ws-client";

type ChatMessage = {
  id?: string;
  type: "message" | "trade_signal" | "system";
  user: string;
  text: string;
  gif?: string;
  timestamp: number;
  color?: string;
  trader?: string;
  side?: "buy_up" | "buy_down" | "sell";
  marketId?: string;
  marketTitle?: string;
  price?: number;
  size?: number;
};

export function useChat(potId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!potId) return;

    const channel = `chat:pot:${potId}`;
    wsClient.send({ type: "subscribe", channel });

    const unsubMessage = wsClient.on("chat_message", (msg: Record<string, unknown>) => {
      if (msg.channel !== channel) return;
      setMessages((prev) => [
        ...prev.slice(-100),
        {
          id: String(msg.id ?? ""),
          type: "message" as const,
          user: String(msg.user ?? "Anonymous"),
          text: String(msg.text ?? ""),
          gif: msg.gif as string | undefined,
          timestamp: Number(msg.timestamp ?? Date.now()),
          color: msg.color as string | undefined,
        },
      ]);
    });

    const unsubSignal = wsClient.on("trade_signal", (msg: Record<string, unknown>) => {
      if (msg.channel !== channel) return;
      setMessages((prev) => [
        ...prev.slice(-100),
        {
          id: String(msg.id ?? ""),
          type: "trade_signal",
          user: String(msg.trader ?? "Trader"),
          text: "",
          timestamp: Number(msg.timestamp ?? Date.now()),
          trader: msg.trader as string | undefined,
          side: msg.side as "buy_up" | "buy_down" | "sell" | undefined,
          marketId: msg.marketId as string | undefined,
          marketTitle: msg.marketTitle as string | undefined,
          price: msg.price as number | undefined,
          size: msg.size as number | undefined,
        },
      ]);
    });

    setConnected(true);

    return () => {
      unsubMessage();
      unsubSignal();
      wsClient.send({ type: "unsubscribe", channel });
      setConnected(false);
    };
  }, [potId]);

  const send = useCallback(
    (text: string, gif?: string) => {
      wsClient.send({
        type: "chat_message",
        channel: `chat:pot:${potId}`,
        text,
        gif,
        timestamp: Date.now(),
      });
    },
    [potId]
  );

  return { messages, send, connected };
}
