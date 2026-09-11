const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const WS_BASE = import.meta.env.VITE_WS_URL ?? "ws://localhost:3001";

type MessageHandler = (msg: Record<string, unknown>) => void;

export class WsClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<MessageHandler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  connect(path: string, token?: string) {
    const url = token
      ? `${WS_BASE}${path}?token=${token}`
      : `${WS_BASE}${path}`;

    this.ws = new WebSocket(url);

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as Record<string, unknown>;
        const type = msg.type as string;
        this.handlers.get(type)?.forEach((h) => h(msg));
        this.handlers.get("*")?.forEach((h) => h(msg));
      } catch {
        // ignore parse errors
      }
    };

    this.ws.onclose = () => {
      this.reconnectTimer = setTimeout(() => this.connect(path, token), 3000);
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  send(msg: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }
}

export const wsClient = new WsClient();
