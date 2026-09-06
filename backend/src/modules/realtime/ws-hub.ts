import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { verifyToken } from "../auth/jwt.js";
import type { JwtClaims } from "@betterfun/shared";
import { logger } from "../../lib/logger.js";

interface HubClient extends WebSocket {
  _channels: Set<string>;
  _claims?: JwtClaims;
}

const clients = new Set<HubClient>();

// A channel is a topic string, e.g. "pot:{potId}", "account:{address}",
// "markets", "chat:{roomId}", "notifications:{userId}".
export function broadcast(channel: string, payload: unknown): void {
  const json = JSON.stringify(payload);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN && (client._channels.has(channel) || client._channels.has("*"))) {
      client.send(json);
    }
  }
}

export function setupWsHub(server: Server): WebSocketServer {
  // Use noServer mode so we can share the HTTP server with chat-ws.
  // The main startup code calls server.on('upgrade') to route by path.
  const wss = new WebSocketServer({ noServer: true, perMessageDeflate: false });

  wss.on("connection", (ws: HubClient, req) => {
    ws._channels = new Set();

    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");
    if (token) {
      ws._claims = verifyToken(token) ?? undefined;
    }

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "subscribe" && typeof msg.channel === "string") {
          ws._channels.add(msg.channel);
          ws.send(JSON.stringify({ type: "subscribed", channel: msg.channel }));
        } else if (msg.type === "unsubscribe" && typeof msg.channel === "string") {
          ws._channels.delete(msg.channel);
          ws.send(JSON.stringify({ type: "unsubscribed", channel: msg.channel }));
        }
      } catch {
        ws.send(JSON.stringify({ type: "error", message: "Invalid message" }));
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
    });

    clients.add(ws);
  });

  logger.info("WS hub listening on /ws");
  return wss;
}
