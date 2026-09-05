import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

function reputationTier(r: number): { label: string; hue: number } {
  if (r >= 80) return { label: "Elite", hue: 145 };
  if (r >= 60) return { label: "Pro", hue: 200 };
  if (r >= 40) return { label: "Rising", hue: 45 };
  return { label: "New", hue: 0 };
}

export function ReputationBadge({
  score,
  showScore = true,
  className,
}: {
  score: number;
  showScore?: boolean;
  className?: string;
}) {
  const tier = reputationTier(score);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        className,
      )}
      style={{
        backgroundColor: `hsl(${tier.hue} 70% 45% / 0.15)`,
        color: `hsl(${tier.hue} 70% 38%)`,
      }}
    >
      <ShieldCheck className="h-3.5 w-3.5" />
      {tier.label}
      {showScore && <span className="num opacity-70">· {score}</span>}
    </span>
  );
}
