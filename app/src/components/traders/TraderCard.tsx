import { Link } from "@tanstack/react-router";
import { Radio, Users } from "lucide-react";
import { Sparkline } from "@/components/market/Sparkline";
import { TraderAvatar } from "./TraderAvatar";
import { ReputationBadge } from "./ReputationBadge";
import { StrategyInfoNote } from "./StrategyInfoNote";
import { EpochPhaseBadge } from "./EpochPhaseBadge";
import { B3TR } from "@/components/Token";

function fmtFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

type Trader = {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string;
  bio: string;
  country: string;
  tags: string[];
  verified: boolean;
  reputation: number;
  pnl30: number;
  winRate: number;
  followers: number;
  aum: number;
  isLive: boolean;
};

type Pot = {
  id: string;
  epochId: string;
  strategy?: { title: string; note: string; risk: string; focus: string[] };
  status: string;
};

export function TraderCard({
  trader,
  rank,
  pot,
  epochPhase,
}: {
  trader: Trader;
  rank?: number;
  pot?: Pot;
  epochPhase?: string;
}) {
  const t = trader;
  const positive = t.pnl30 >= 0;
  const equityCurve = Array.from({ length: 20 }, (_, i) => {
    const tt = i / 19;
    return 50 + t.pnl30 * tt + Math.sin(i * 1.3) * Math.abs(t.pnl30) * 0.05;
  });

  return (
    <div className="group flex flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50">
      <div className="flex items-center gap-3">
        {rank !== undefined && (
          <span className="num w-5 text-center text-sm font-bold text-muted-foreground">
            {rank}
          </span>
        )}
        <TraderAvatar name={t.name} hue={0} avatarUrl={t.avatarUrl} size={44} live={t.isLive} />
        <div className="min-w-0 flex-1">
          <Link
            to="/traders/$id"
            params={{ id: t.id }}
            className="block truncate text-sm font-bold hover:text-primary"
          >
            {t.name}
          </Link>
          <div className="truncate text-xs text-muted-foreground">@{t.handle}</div>
        </div>
        <ReputationBadge score={t.reputation} showScore={false} />
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            30D PnL
          </div>
          <div
            className={`num text-xl font-bold ${positive ? "text-up" : "text-down"}`}
          >
            {positive ? "+" : ""}
            {t.pnl30.toFixed(1)}%
          </div>
        </div>
        <div className="h-9 w-24">
          <Sparkline
            data={equityCurve}
            color={positive ? "hsl(var(--up))" : "hsl(var(--down))"}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1">
        {t.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-secondary/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
          >
            {tag}
          </span>
        ))}
        {epochPhase && <EpochPhaseBadge phase={epochPhase as any} />}
      </div>

      {pot?.strategy && <StrategyInfoNote strategy={pot.strategy} compact className="mt-3" />}

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
        <div>
          <div className="num text-sm font-semibold text-foreground">{t.winRate}%</div>
          <div className="text-[11px] text-muted-foreground">Win rate</div>
        </div>
        <div>
          <div className="num text-sm font-semibold text-foreground">
            {fmtFollowers(t.followers)}
          </div>
          <div className="text-[11px] text-muted-foreground">Followers</div>
        </div>
        <div>
          <B3TR
            amount={t.aum}
            compact
            iconSize={13}
            className="justify-center text-sm font-semibold text-foreground"
          />
          <div className="text-[11px] text-muted-foreground">Pot TVL</div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {pot ? (
          <Link
            to="/pots/$id"
            params={{ id: pot.id }}
            className="flex-1 rounded-lg border border-border py-2 text-center text-sm font-semibold text-foreground transition-colors hover:bg-secondary/60"
          >
            View pot
          </Link>
        ) : (
          <Link
            to="/traders/$id"
            params={{ id: t.id }}
            className="flex-1 rounded-lg border border-border py-2 text-center text-sm font-semibold text-foreground transition-colors hover:bg-secondary/60"
          >
            View profile
          </Link>
        )}
        {t.isLive ? (
          <Link
            to="/live/$id"
            params={{ id: t.id }}
            className="flex items-center gap-1.5 rounded-lg bg-down px-3 py-2 text-sm font-semibold text-down-foreground transition-all hover:brightness-110"
          >
            <Radio className="h-4 w-4" /> Live
          </Link>
        ) : (
          <span className="flex items-center gap-1 rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> {fmtFollowers(t.followers)}
          </span>
        )}
      </div>
    </div>
  );
}
