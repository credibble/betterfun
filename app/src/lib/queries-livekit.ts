import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "./api-client";

export function useLiveKitToken() {
  return useMutation({
    mutationFn: (room: string) =>
      api<{ token: string; url: string }>("/livekit/token", {
        method: "POST",
        body: JSON.stringify({ room }),
      }),
  });
}

export function useLiveKitStreamSetup() {
  return useMutation({
    mutationFn: (room: string) =>
      api<{ rtmpUrl: string; streamKey: string; serverUrl: string; ingressId?: string; configured?: boolean }>(
        "/livekit/stream-setup",
        {
          method: "POST",
          body: JSON.stringify({ room }),
        },
      ),
  });
}

export function useLiveKitRoom() {
  return useMutation({
    mutationFn: (name: string) =>
      api<{ room: unknown }>("/livekit/room", { method: "POST", body: JSON.stringify({ name }) }),
  });
}

export function useLiveKitParticipants(room: string | undefined) {
  return useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["livekit", room, "participants"],
    queryFn: () => api(`/livekit/${room}/participants`),
    enabled: !!room,
    refetchInterval: 10_000,
  });
}
