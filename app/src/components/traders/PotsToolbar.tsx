import { Search, ArrowUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type EpochPhase = "pre_start" | "live" | "post_end" | "settled";

type PotStrategy = {
  risk: string;
};

function riskLabel(r: string): string {
  switch (r) {
    case "conservative": return "Conservative";
    case "balanced": return "Balanced";
    case "aggressive": return "Aggressive";
    default: return r;
  }
}

export type PotSort = "size" | "return" | "phase" | "name";
export type PotRiskFilter = "all" | PotStrategy["risk"];
export type PotPhaseFilter = "all" | EpochPhase;

const SORT_OPTIONS: { value: PotSort; label: string }[] = [
  { value: "size", label: "Largest pot" },
  { value: "return", label: "Est. return" },
  { value: "phase", label: "Round phase" },
  { value: "name", label: "Trader name" },
];

const RISK_OPTIONS: { value: PotRiskFilter; label: string }[] = [
  { value: "all", label: "All risk" },
  { value: "conservative", label: riskLabel("conservative") },
  { value: "balanced", label: riskLabel("balanced") },
  { value: "aggressive", label: riskLabel("aggressive") },
];

const PHASE_OPTIONS: { value: PotPhaseFilter; label: string }[] = [
  { value: "all", label: "All phases" },
  { value: "pre_start", label: "Open to join" },
  { value: "live", label: "Trading now" },
  { value: "post_end", label: "Wrapping up" },
  { value: "settled", label: "Settled" },
];

export function PotsToolbar({
  query,
  onQueryChange,
  sort,
  onSortChange,
  risk,
  onRiskChange,
  phase,
  onPhaseChange,
  resultCount,
  className,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  sort: PotSort;
  onSortChange: (s: PotSort) => void;
  risk: PotRiskFilter;
  onRiskChange: (r: PotRiskFilter) => void;
  phase: PotPhaseFilter;
  onPhaseChange: (p: PotPhaseFilter) => void;
  resultCount: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search trader or pot…"
            className="w-full rounded-lg border border-border bg-secondary/40 py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
            aria-label="Search pots"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={sort} onValueChange={(v) => onSortChange(v as PotSort)}>
            <SelectTrigger className="h-10 w-[148px] border-border bg-card" aria-label="Sort pots">
              <ArrowUpDown className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={risk} onValueChange={(v) => onRiskChange(v as PotRiskFilter)}>
            <SelectTrigger className="h-10 w-[130px] border-border bg-card" aria-label="Filter by risk">
              <SelectValue placeholder="Risk" />
            </SelectTrigger>
            <SelectContent>
              {RISK_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={phase} onValueChange={(v) => onPhaseChange(v as PotPhaseFilter)}>
            <SelectTrigger className="h-10 w-[140px] border-border bg-card" aria-label="Filter by phase">
              <SelectValue placeholder="Phase" />
            </SelectTrigger>
            <SelectContent>
              {PHASE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{resultCount}</span> pot
        {resultCount === 1 ? "" : "s"}
      </p>
    </div>
  );
}
