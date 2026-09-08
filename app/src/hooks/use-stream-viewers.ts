import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useStreamViewers(roomName: string) {
  return useQuery<{ count: number }>({
    queryKey: ["stream-viewers", roomName],
    queryFn: async () => {
      try {
        const participants = await api<any[]>(`/livekit/${roomName}/participants`);
        return { count: Array.isArray(participants) ? participants.length : 0 };
      } catch {
        return { count: 0 };
      }
    },
    refetchInterval: 10_000,
  });
}
