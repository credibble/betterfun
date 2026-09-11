import { useQuery, useMutation } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { api } from "./api-client";

export function useLiveKitToken() {
  const { address } = useAccount();
  return useMutation({
    mutationFn: (room: string) =>
      api<{ token: string; url: string }>("/livekit/token", {
        method: "POST",
        body: JSON.stringify({ room, address }),
      }),
  });
}

export function useLiveKitStreamSetup() {
  const { address } = useAccount();
  return useMutation({
    mutationFn: (room: string) =>
      api<{ rtmpUrl: string; streamKey: string; serverUrl: string; ingressId?: string; configured?: boolean }>(
        "/livekit/stream-setup",
        {
          method: "POST",
          body: JSON.stringify({ room, address }),
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