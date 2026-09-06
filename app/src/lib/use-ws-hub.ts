import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { wsClient } from "./ws-client";

/**
 * Connects the general-purpose WS hub and subscribes to channels.
 * Invalidates React Query caches when updates arrive.
 */
export function useWsHub(channels: string[] = []) {
  const queryClient = useQueryClient();
  const channelsRef = useRef(channels);
  channelsRef.current = channels;

  useEffect(() => {
    wsClient.connect("/ws");

    return () => {
      wsClient.disconnect();
    };
  }, []);

  // Subscribe/unsubscribe to channels whenever they change
  useEffect(() => {
    for (const ch of channelsRef.current) {
      wsClient.send({ type: "subscribe", channel: ch });
    }

    return () => {
      for (const ch of channelsRef.current) {
        wsClient.send({ type: "unsubscribe", channel: ch });
      }
    };
  }, [channels.join(",")]);

  // Global message handlers that invalidate queries
  useEffect(() => {
    const unsubs = [
      wsClient.on("pot:update", (msg: any) => {
        if (msg.potId) {
          queryClient.invalidateQueries({ queryKey: ["pots"] });
          queryClient.invalidateQueries({ queryKey: ["positions", msg.potId] });
          queryClient.invalidateQueries({ queryKey: ["trades", msg.potId] });
        }
      }),
      wsClient.on("trade:update", (msg: any) => {
        if (msg.potId) {
          queryClient.invalidateQueries({ queryKey: ["positions", msg.potId] });
          queryClient.invalidateQueries({ queryKey: ["trades", msg.potId] });
        }
      }),
      wsClient.on("epoch:update", () => {
        queryClient.invalidateQueries({ queryKey: ["epochs"] });
        queryClient.invalidateQueries({ queryKey: ["pots"] });
      }),
    ];

    return () => unsubs.forEach((u) => u());
  }, [queryClient]);
}
