import { cn } from "@/lib/utils";

interface ProbabilityBarProps {
  yesPercent: number;
  noPercent: number;
  showLabels?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  animate?: boolean;
}

export function ProbabilityBar({
  yesPercent,
  noPercent,
  showLabels = true,
  size = "md",
  className,
  animate = true,
}: ProbabilityBarProps) {
  const clampedYes = Math.max(0, Math.min(100, yesPercent));
  const clampedNo = Math.max(0, Math.min(100, noPercent));

  const heights = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  return (
    <div className={cn("w-full", className)}>
      {showLabels && (
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-semibold text-up">
            YES {clampedYes.toFixed(0)}%
          </span>
          <span className="font-semibold text-muted-foreground">
            NO {clampedNo.toFixed(0)}%
          </span>
        </div>
      )}
      <div className={cn("overflow-hidden rounded-full bg-down/20", heights[size])}>
        <div
          className={cn(
            "h-full rounded-full bg-up transition-all",
            animate && "duration-500 ease-out",
          )}
          style={{ width: `${clampedYes}%` }}
        />
      </div>
    </div>
  );
}
