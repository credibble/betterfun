import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { onBroadcast } from "../realtime/ws-hub.js";

interface ChatWsClient extends WebSocket {
  _room?: string;
  _identity?: string;
}

export function setupChatWs(server: Server) {
  // Use noServer mode so we can share the HTTP server with the WS hub.
  // The main startup code calls server.on('upgrade') to route by path.
  const wss = new WebSocketServer({ noServer: true, perMessageDeflate: false });

  // Bridge hub broadcast events (e.g. trade_signal) into matching chat rooms.
  onBroadcast((channel, payload) => {
    if (!channel.startsWith("chat:")) return;
    const room = channel.slice("chat:".length);
    const json = JSON.stringify(payload);
    wss.clients.forEach((client) => {
      const c = client as ChatWsClient;
      if (c._room === room && c.readyState === WebSocket.OPEN) {
        c.send(json);
      }
    });
  });

  interface AliveWs extends WebSocket {
    isAlive?: boolean;
  }

  // Heartbeat: ping every 30s, terminate unresponsive clients.
  const heartbeat = setInterval(() => {
    wss.clients.forEach((client) => {
      const c = client as AliveWs;
      if (c.isAlive === false) {
        c.terminate();
        return;
      }
      c.isAlive = false;
      c.ping();
    });
  }, 30_000);

  wss.on("connection", (ws: ChatWsClient & AliveWs, req) => {
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const room = url.searchParams.get("room");
    const identity = url.searchParams.get("identity");

    if (!room || !identity) {
      ws.close(4000, "room and identity required");
      return;
    }

    ws._room = room;
    ws._identity = identity;

    // Broadcast join to same-room clients only
    broadcastToRoom(wss, room, {
      type: "system",
      message: `${identity} joined`,
      ts: Date.now(),
    });

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        broadcastToRoom(wss, room, {
          type: "chat",
          identity,
          message: msg.message,
          ts: Date.now(),
        });
      } catch {
        ws.send(JSON.stringify({ type: "error", message: "Invalid message" }));
      }
    });

    ws.on("close", () => {
      broadcastToRoom(wss, room, {
        type: "system",
        message: `${identity} disconnected`,
        ts: Date.now(),
      });
    });
  });

  wss.on("close", () => clearInterval(heartbeat));

  return wss;
}

function broadcastToRoom(
  wss: WebSocketServer,
  room: string,
  payload: Record<string, unknown>,
) {
  const json = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    const c = client as ChatWsClient;
    if (c._room === room && c.readyState === WebSocket.OPEN) {
      c.send(json);
    }
  });
}
