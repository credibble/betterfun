import { Link } from "@tanstack/react-router";
import { Flame, ChevronRight } from "lucide-react";
import { usePots } from "@/lib/queries";

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

export function HotTopics() {
  const { data: pots = [] } = usePots();

  const potList = Array.isArray(pots) ? pots : [];
  const top = [...potList]
    .sort((a, b) => b.nav - a.nav)
    .slice(0, 5);

  const topics =
    top.length > 0
      ? top.map((p, i) => ({
          rank: i + 1,
          id: p.id,
          label: p.strategy?.title ?? `Pot ${p.id.slice(0, 8)}`,
          vol: `${formatUsd(p.nav)} in the pot`,
          status: p.status,
        }))
      : [
          { rank: 1, id: "", label: "No pots yet", vol: "Back a trader next epoch", status: "funding" },
        ];

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <Link to="/pots" className="mb-2 flex items-center gap-1 hover:text-primary">
        <h3 className="text-base font-bold tracking-tight">Top pots</h3>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>

      <div className="divide-y divide-border">
        {topics.map((t) => (
          <Link
            key={t.id || t.rank}
            to={t.id ? "/pots/$id" : "/pots"}
            params={t.id ? { id: t.id } : undefined}
            className="flex items-center gap-3 py-2.5 transition-colors hover:bg-secondary/30"
          >
            <span className="num w-4 text-sm font-semibold text-muted-foreground">
              {t.rank}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {t.label}
            </span>
            <span className="text-xs text-muted-foreground">{t.vol}</span>
            <Flame className="h-3.5 w-3.5 shrink-0 text-primary" />
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>

      <Link
        to="/pots"
        className="mt-3 flex w-full items-center justify-center rounded-lg border border-border bg-secondary/40 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/70"
      >
        Explore all pots
      </Link>
    </div>
  );
}