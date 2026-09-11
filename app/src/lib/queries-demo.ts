import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api-client";

export function useDemoSeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ ok: boolean; epoch: unknown }>("/demo/seed", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subgraph", "epochs"] }),
  });
}

export function useDemoFastForward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (epochId: string) =>
      api<{ ok: boolean; action: string; status: string }>(`/demo/fast-forward/${epochId}`, {
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subgraph", "epochs"] });
      qc.invalidateQueries({ queryKey: ["subgraph", "pots"] });
    },
  });
}
