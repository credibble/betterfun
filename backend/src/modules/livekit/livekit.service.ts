import {
  RoomServiceClient,
  AccessToken,
  TwirpError,
  LiveKitAPI,
  IngressInput,
} from "livekit-server-sdk";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

let roomService: RoomServiceClient | null = null;

export function initLiveKit() {
  if (!env.LIVEKIT_API_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
    logger.warn("LiveKit env vars missing (LIVEKIT_API_URL/KEY/SECRET) — LiveKit disabled");
    roomService = null;
    return;
  }
  try {
    roomService = new RoomServiceClient(env.LIVEKIT_API_URL, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
    logger.info("LiveKit initialized");
  } catch (err) {
    logger.warn(err, "LiveKit init failed");
    roomService = null;
  }
}

export async function createLiveKitToken(input: {
  identity: string;
  room: string;
  name?: string;
  ttl?: number;
}): Promise<string | null> {
  if (!roomService) return null;

  try {
    const at = new AccessToken(env.LIVEKIT_API_KEY!, env.LIVEKIT_API_SECRET!, {
      identity: input.identity,
      name: input.name,
      ttl: input.ttl ?? 86400,
    });
    at.addGrant({ roomJoin: true, room: input.room });
    return await at.toJwt();
  } catch (err) {
    logger.error(err, "Failed to create LiveKit token");
    return null;
  }
}

export async function createRoom(name: string) {
  if (!roomService) return null;
  try {
    const room = await roomService.createRoom({ name, emptyTimeout: 300_000 });
    return room;
  } catch (err) {
    if (err instanceof TwirpError && err.status === 409) {
      // Room already exists, fetch it
      const rooms = await roomService.listRooms([name]);
      return rooms?.[0] ?? null;
    }
    throw err;
  }
}

/**
 * Create (or reuse) a LiveKit Ingress so an external RTMP encoder (OBS/FFmpeg)
 * can push into a room. Returns the RTMP server URL + stream key the encoder
 * needs — NOT a publish AccessToken.
 */
export async function createStreamIngress(input: {
  room: string;
  identity: string;
  name?: string;
}): Promise<{ url: string; streamKey: string; ingressId: string } | null> {
  if (!env.LIVEKIT_API_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) return null;

  const api = new LiveKitAPI({
    host: env.LIVEKIT_API_URL,
    apiKey: env.LIVEKIT_API_KEY,
    secret: env.LIVEKIT_API_SECRET,
  });
  try {
    // Reuse an existing ingress for this room if one already exists.
    const existing = await api.ingress.listIngress({ roomName: input.room });
    if (existing.length > 0) {
      const ing = existing[0]!;
      return { url: ing.url, streamKey: ing.streamKey, ingressId: ing.ingressId };
    }

    const ing = await api.ingress.createIngress(IngressInput.RTMP_INPUT, {
      name: input.name ?? `stream-${input.room}`,
      roomName: input.room,
      participantIdentity: input.identity,
      participantName: input.name ?? input.identity,
      enableTranscoding: true,
    });
    logger.info(`Created RTMP ingress for room ${input.room} (${ing.ingressId})`);
    return { url: ing.url, streamKey: ing.streamKey, ingressId: ing.ingressId };
  } catch (err) {
    logger.error(err, `createIngress failed for room ${input.room}`);
    return null;
  }
}

export async function listParticipants(room: string) {
  if (!roomService) return [];
  try {
    return await roomService.listParticipants(room);
  } catch {
    return [];
  }
}

export async function removeParticipant(room: string, identity: string) {
  if (!roomService) return;
  try {
    await roomService.removeParticipant(room, identity);
  } catch (err) {
    logger.error(err, `Failed to remove participant ${identity}`);
  }
}

export { roomService };
export { TwirpError };