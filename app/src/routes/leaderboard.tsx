import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Trophy, TrendingUp, Video, Crown, Medal } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { TraderAvatar } from "@/components/traders/TraderAvatar";
import { ReputationBadge } from "@/components/traders/ReputationBadge";
import { cn } from "@/lib/utils";
import { B3TR, XP } from "@/components/Token";
import { useTraders } from "@/lib/queries";

function fmtFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function traderXp(t: { pnl30: number; winRate: number; followers: number; aum: number }): number {
  return Math.round(
    Math.max(0, t.pnl30 * 10) +
    t.winRate * 2 +
    Math.log10(t.followers + 1) * 50 +
    Math.log10(t.aum + 1) * 30,
  );
}

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Top Traders by PnL & Reputation | BetterFun" },
      {
        name: "description",
        content:
          "See the top-performing traders on BetterFun ranked by verified PnL, reputation, win rate and followers. Follow and stake to copy the best.",
      },
      { property: "og:title", content: "Trader Leaderboard | BetterFun" },
      {
        property: "og:description",
        content: "Verified PnL, reputation and win-rate rankings for the top traders.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: LeaderboardPage,
});

const ranges = ["30 days", "All time"] as const;
type Range = (typeof ranges)[number];
const sorts = ["XP", "PnL", "Reputation"] as const;
type Sort = (typeof sorts)[number];

function rankColor(rank: number) {
  if (rank === 1) return "text-[hsl(43_90%_50%)]";
  if (rank === 2) return "text-muted-foreground";
  if (rank === 3) return "text-[hsl(25_70%_50%)]";
  return "text-muted-foreground/70";
}

function LeaderboardPage() {
  const [range, setRange] = useState<Range>("30 days");
  const [sort, setSort] = useState<Sort>("XP");
  const { data } = useTraders();
  const traders = Array.isArray(data) ? data : [];

  const list = useMemo(() => {
    const sorted = [...traders];
    if (sort === "Reputation") {
      sorted.sort((a, b) => (b.reputation ?? 0) - (a.reputation ?? 0));
    } else if (sort === "PnL") {
      sorted.sort((a, b) => (b.pnl30 ?? 0) - (a.pnl30 ?? 0));
    } else {
      sorted.sort((a, b) => traderXp(b as any) - traderXp(a as any));
    }
    return sorted;
  }, [traders, sort]);
  const podium = list.slice(0, 3);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full min-h-[80vh] max-w-[1100px] flex-1 px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
              <Trophy className="h-7 w-7 text-[hsl(43_90%_50%)]" /> Leaderboard
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              The best traders on BetterFun, ranked by verified performance.
            </p>
          </div>
          <Link
            to="/become-a-trader"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-block-primary transition-all duration-150 hover:brightness-110 active:translate-y-[3px] active:shadow-none"
          >
            <Video className="h-4 w-4" /> Become a trader
          </Link>
        </div>

        {/* Controls */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Segmented options={sorts} value={sort} onChange={setSort} />
          <Segmented options={ranges} value={range} onChange={setRange} />
        </div>

        {/* Podium */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {podium.map((t, i) => (
            <PodiumCard key={t.id} trader={t} rank={i + 1} sort={sort} />
          ))}
        </div>

        {/* Table */}
        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid grid-cols-[48px_1fr_auto] items-center gap-3 border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid-cols-[48px_1fr_120px_100px_120px]">
            <span>#</span>
            <span>Trader</span>
            <span className="hidden text-right sm:block">Win rate</span>
            <span className="hidden text-right sm:block">Followers</span>
            <span className="text-right">{sort}</span>
          </div>
          {list.map((t, i) => {
            const rank = i + 1;
            const pnl = t.pnl30 ?? 0;
            return (
              <Link
                key={t.id}
                to="/traders/$id"
                params={{ id: t.id }}
                className="grid grid-cols-[48px_1fr_auto] items-center gap-3 border-b border-border/60 px-4 py-3 transition-colors last:border-0 hover:bg-secondary/40 sm:grid-cols-[48px_1fr_120px_100px_120px]"
              >
                <span
                  className={cn(
                    "num flex items-center gap-1 text-sm font-bold",
                    rankColor(rank),
                  )}
                >
                  {rank <= 3 ? <Medal className="h-4 w-4" /> : null}
                  {rank}
                </span>
                <span className="flex min-w-0 items-center gap-3">
                  <TraderAvatar name={t.name} avatarUrl={t.avatarUrl} size={38} live={t.isLive} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{t.name}</span>
                      {t.isLive && (
                        <span className="rounded bg-down/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-down">
                          Live
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      @{t.handle}
                    </span>
                  </span>
                </span>
                <span className="num hidden text-right text-sm font-medium text-foreground sm:block">
                  {t.winRate}%
                </span>
                <span className="num hidden text-right text-sm text-muted-foreground sm:block">
                  {fmtFollowers(t.followers ?? 0)}
                </span>
                <span className="flex justify-end text-right">
                  {sort === "Reputation" ? (
                    <ReputationBadge score={t.reputation ?? 0} />
                  ) : sort === "XP" ? (
                    <XP amount={traderXp(t as any)} compact iconSize={15} className="text-sm font-bold text-foreground" />
                  ) : (
                    <span
                      className={cn(
                        "num inline-flex items-center gap-1 text-sm font-bold",
                        pnl >= 0 ? "text-up" : "text-down",
                      )}
                    >
                      <TrendingUp className="h-3.5 w-3.5" />
                      {pnl >= 0 ? "+" : ""}
                      {pnl.toFixed(1)}%
                    </span>
                  )}
                </span>

              </Link>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-secondary/40 p-1">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
            value === o
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function PodiumCard({
  trader,
  rank,
  sort,
}: {
  trader: any;
  rank: number;
  sort: Sort;
}) {
  return (
    <Link
      to="/traders/$id"
      params={{ id: trader.id }}
      className={cn(
        "relative flex flex-col items-center rounded-xl border bg-card p-5 text-center transition-colors hover:border-primary/50",
        rank === 1 ? "border-[hsl(43_90%_50%)/0.5]" : "border-border",
      )}
    >
      {rank === 1 && (
        <Crown className="absolute -top-3 h-6 w-6 text-[hsl(43_90%_50%)]" />
      )}
      <span className="num text-xs font-bold text-muted-foreground">#{rank}</span>
      <TraderAvatar
        name={trader.name}
        avatarUrl={trader.avatarUrl}
        size={56}
        live={trader.isLive}
        className="mt-2"
      />
      <div className="mt-3 text-sm font-bold">{trader.name}</div>
      <div className="text-xs text-muted-foreground">@{trader.handle}</div>
      <div className="mt-3">
        {sort === "Reputation" ? (
          <ReputationBadge score={trader.reputation ?? 0} />
        ) : sort === "XP" ? (
          <XP amount={traderXp(trader)} iconSize={18} className="text-lg font-bold text-foreground" />
        ) : (
          <span className="num text-lg font-bold text-up">
            +{(trader.pnl30 ?? 0).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="mt-3 flex w-full items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
        <span>
          Win <span className="num text-foreground">{trader.winRate}%</span>
        </span>
        <span className="flex items-center gap-1">
          AUM <B3TR amount={trader.aum ?? 0} compact iconSize={12} className="text-foreground" />
        </span>
      </div>

    </Link>
  );
}
