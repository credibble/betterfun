import { NotebookPen } from "lucide-react";
import { cn } from "@/lib/utils";

type PotStrategy = {
  title: string;
  risk: string;
  note: string;
  focus: string[];
};

function riskLabel(r: string): string {
  switch (r) {
    case "conservative": return "Conservative";
    case "balanced": return "Balanced";
    case "aggressive": return "Aggressive";
    default: return r;
  }
}

export function StrategyInfoNote({
  strategy,
  className,
  compact = false,
}: {
  strategy: PotStrategy;
  className?: string;
  compact?: boolean;
}) {
  return (
    <aside
      className={cn(
        "rounded-lg border border-border bg-secondary/25",
        compact ? "px-3 py-2.5" : "px-3.5 py-3",
        className,
      )}
      aria-label="How this pot trades"
    >
      <div className="flex items-start gap-2">
        <NotebookPen
          className={cn(
            "mt-0.5 shrink-0 text-muted-foreground",
            compact ? "h-3.5 w-3.5" : "h-4 w-4",
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={cn(
                "font-semibold text-foreground",
                compact ? "text-xs" : "text-sm",
              )}
            >
              {compact ? strategy.title : "How they trade"}
            </p>
            <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {riskLabel(strategy.risk)}
            </span>
          </div>
          {!compact && (
            <p className="mt-1 text-xs font-medium text-foreground/90">{strategy.title}</p>
          )}
          <p
            className={cn(
              "mt-1 leading-relaxed text-muted-foreground",
              compact ? "line-clamp-2 text-[11px]" : "text-xs",
            )}
          >
            {strategy.note}
          </p>
          {!compact && strategy.focus.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {strategy.focus.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-secondary/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
