import { useState, useCallback } from "react";

type ChatMessage = {
  id: string;
  type: "chat" | "system" | "trade_signal";
  user?: string;
  trader?: string;
  side?: "buy_up" | "buy_down" | "sell";
  marketId?: string;
  marketTitle?: string;
  price?: number;
  size?: number;
  text: string;
  timestamp: number;
};

/**
 * Local in-memory chat feed. The old backend WS chat hub was removed when
 * auth was dropped; chat now lives entirely client-side for the session.
 */
export function useChat(_traderId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected] = useState(false);

  const send = useCallback((text: string) => {
    if (!text.trim()) return;
    const msg: ChatMessage = {
      id: `local-${Date.now()}`,
      type: "chat",
      user: "you",
      text: text.trim(),
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, msg]);
  }, []);

  return { messages, send, connected };
}