import { Link } from "@tanstack/react-router";
import { ArrowRight, Radio } from "lucide-react";
import { Sparkline } from "@/components/market/Sparkline";
import { TraderAvatar } from "@/components/traders/TraderAvatar";
import { ReputationBadge } from "@/components/traders/ReputationBadge";
import { useTraders } from "@/lib/queries";

function fmtFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function pnlSparkline(pnl30: number): number[] {
  const points = 20;
  const data: number[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const trend = pnl30 * t;
    const noise = Math.sin(i * 1.3) * Math.abs(pnl30) * 0.05;
    data.push(50 + trend + noise);
  }
  return data;
}

export function TopTraders() {
  const { data } = useTraders();
  const traders = Array.isArray(data) ? data : [];
  const top = [...traders]
    .sort((a, b) => b.pnl30 - a.pnl30)
    .slice(0, 4);

  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Top traders</h2>
          <p className="text-sm text-muted-foreground">
            Follow verified PnL, watch streams, and stake Pot LP into their epoch pots.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            to="/pots"
            className="flex items-center gap-1 text-sm font-semibold text-link hover:underline"
          >
            Pots <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/traders"
            className="flex items-center gap-1 text-sm font-semibold text-link hover:underline"
          >
            Traders <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {top.map((t) => {
          const positive = t.pnl30 >= 0;
          return (
            <Link
              key={t.id}
              to="/traders/$id"
              params={{ id: t.id }}
              className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
            >
              <div className="flex items-center gap-3">
                <TraderAvatar name={t.name} hue={0} avatarUrl={undefined} size={40} live={t.isLive} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold group-hover:text-primary">
                    {t.name}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {fmtFollowers(t.followers)} followers
                  </div>
                </div>
                {t.isLive && (
                  <span className="flex items-center gap-1 rounded bg-down/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-down">
                    <Radio className="h-3 w-3" /> Live
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    30D PnL
                  </div>
                  <div
                    className={`num text-lg font-bold ${positive ? "text-up" : "text-down"}`}
                  >
                    {positive ? "+" : ""}
                    {t.pnl30.toFixed(1)}%
                  </div>
                </div>
                <div className="h-8 w-20">
                  <Sparkline
                    data={pnlSparkline(t.pnl30)}
                    color={positive ? "hsl(var(--up))" : "hsl(var(--down))"}
                  />
                </div>
              </div>
              <div className="mt-3 border-t border-border pt-2">
                <ReputationBadge score={t.reputation} />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
