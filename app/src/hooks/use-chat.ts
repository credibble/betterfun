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

    const unsubMessage = wsClient.on("chat_message", (msg: any) => {
      if (msg.channel !== channel) return;
      setMessages((prev) => [
        ...prev.slice(-100),
        {
          id: msg.id,
          type: "message",
          user: msg.user ?? "Anonymous",
          text: msg.text ?? "",
          gif: msg.gif,
          timestamp: msg.timestamp ?? Date.now(),
          color: msg.color,
        },
      ]);
    });

    const unsubSignal = wsClient.on("trade_signal", (msg: any) => {
      if (msg.channel !== channel) return;
      setMessages((prev) => [
        ...prev.slice(-100),
        {
          id: msg.id,
          type: "trade_signal",
          user: msg.trader ?? "Trader",
          text: "",
          timestamp: msg.timestamp ?? Date.now(),
          trader: msg.trader,
          side: msg.side,
          marketId: msg.marketId,
          marketTitle: msg.marketTitle,
          price: msg.price,
          size: msg.size,
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
