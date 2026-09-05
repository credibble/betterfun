import { cn } from "@/lib/utils";

export type EpochPhase = "pre_start" | "live" | "post_end" | "settled" | "upcoming" | "settling";

function phaseLabel(status: string): string {
  switch (status) {
    case "upcoming": return "Upcoming";
    case "live": return "Live";
    case "settling": return "Settling";
    case "settled": return "Settled";
    case "pre_start": return "Open to join";
    case "post_end": return "Wrapping up";
    default: return status;
  }
}

export function EpochPhaseBadge({
  phase,
  className,
}: {
  phase: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-[11px] font-bold",
        (phase === "pre_start" || phase === "upcoming") && "bg-primary/15 text-primary",
        phase === "live" && "bg-up/15 text-up",
        (phase === "post_end" || phase === "settling") && "bg-warn/20 text-warn",
        phase === "settled" && "bg-secondary text-muted-foreground",
        className,
      )}
    >
      {phaseLabel(phase)}
    </span>
  );
}