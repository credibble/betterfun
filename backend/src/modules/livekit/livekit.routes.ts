import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../auth/auth.middleware.js";
import { createLiveKitToken, createRoom, listParticipants, createStreamIngress } from "./livekit.service.js";
import { env } from "../../config/env.js";

export function buildLiveKitRoutes() {
  const router = Router();

  // POST /livekit/token — get a LiveKit join token
  router.post("/token", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { room } = req.body;
      if (!room || typeof room !== "string") {
        res.status(400).json({ error: "room required" });
        return;
      }

      const token = await createLiveKitToken({
        identity: req.claims!.sub,
        room,
        name: req.claims!.address,
      });

      if (!token) {
        res.status(503).json({ error: "LiveKit not configured" });
        return;
      }

      res.json({ token, url: env.LIVEKIT_WS_URL });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  // POST /livekit/room — create a room
  router.post("/room", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== "string") {
        res.status(400).json({ error: "name required" });
        return;
      }
      const room = await createRoom(name);
      res.json({ room });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  // POST /livekit/stream-setup — get RTMP ingest URL + stream key for publishing
  // Uses a real LiveKit Ingress (RTMP → room). The returned url/streamKey are
  // exactly what OBS/FFmpeg need.
  router.post("/stream-setup", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { room } = req.body;
      if (!room || typeof room !== "string") {
        res.status(400).json({ error: "room required" });
        return;
      }

      const ingress = await createStreamIngress({
        room,
        identity: `streamer-${req.claims!.sub}`,
        name: req.claims!.address,
      });

      if (!ingress) {
        const fallback = "rtmp://localhost:1935/live";
        res.json({ rtmpUrl: fallback, streamKey: "", serverUrl: fallback, configured: false });
        return;
      }

      res.json({
        rtmpUrl: ingress.url,
        streamKey: ingress.streamKey,
        serverUrl: ingress.url,
        ingressId: ingress.ingressId,
        configured: true,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  // GET /livekit/:room/participants — list participants
  router.get("/:room/participants", async (req, res) => {
    try {
      const parts = await listParticipants(req.params.room as string);
      res.json(parts);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  return router;
}
