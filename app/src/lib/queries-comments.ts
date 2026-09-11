import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "./api-client";

export function useComments(marketId: string) {
  return useQuery<Array<{ id: string; userId: string; text: string; ts: string }>>({
    queryKey: ["comments", marketId],
    queryFn: () => api(`/comments/${marketId}`),
    enabled: !!marketId,
  });
}

export function usePostComment() {
  return useMutation({
    mutationFn: ({ marketId, text }: { marketId: string; text: string }) =>
      api<{ id: string; userId: string; text: string; ts: string }>(`/comments/${marketId}`, {
        method: "POST",
        body: JSON.stringify({ text }),
      }),
  });
}

export function useLikeComment() {
  return useMutation({
    mutationFn: (commentId: string) =>
      api<{ ok: boolean }>(`/comments/${commentId}/like`, { method: "POST" }),
  });
}
