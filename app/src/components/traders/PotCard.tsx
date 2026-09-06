import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { EpochPhaseBadge } from "@/components/traders/EpochPhaseBadge";
import { StrategyInfoNote } from "@/components/traders/StrategyInfoNote";
import { TraderAvatar } from "@/components/traders/TraderAvatar";
import { cn } from "@/lib/utils";

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function seedHue(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * 17) % 360;
  return h;
}

type Pot = {
  id: string;
  traderId: string;
  epochId: string;
  strategy?: { title: string; note: string; risk: string; focus: string[] };
  nav: number;
  lpPrice?: number;
  traderName?: string;
  handle?: string;
};

export function PotCard({
  pot,
  className,
  compactStrategy = true,
}: {
  pot: Pot;
  className?: string;
  compactStrategy?: boolean;
}) {
  const name = pot.traderName ?? "Trader";
  const hue = seedHue(pot.traderId || pot.id);
  const slug = pot.handle ?? pot.id;

  return (
    <article
      className={cn(
        "flex flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Link to="/pots/$id" params={{ id: slug }} className="shrink-0">
          <TraderAvatar
            name={name}
            hue={hue}
            avatarUrl={undefined}
            size={44}
            live={false}
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                to="/pots/$id"
                params={{ id: slug }}
                className="block truncate text-sm font-bold hover:text-primary"
              >
                {name}
              </Link>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                Epoch pot
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] text-muted-foreground">In the pot</p>
          <p className="text-sm font-bold">{formatUsd(pot.nav)}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-muted-foreground">Est. return</p>
          <p className="text-sm font-bold text-up">
            {pot.lpPrice && pot.lpPrice > 0 ? `${((pot.lpPrice - 1) * 100).toFixed(1)}%` : "—"}
          </p>
        </div>
      </div>

      {pot.strategy && (
        <StrategyInfoNote
          strategy={pot.strategy}
          compact={compactStrategy}
          className="mt-3"
        />
      )}

      <Link
        to="/pots/$id"
        params={{ id: slug }}
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-link hover:underline"
      >
        View pot
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </article>
  );
}
