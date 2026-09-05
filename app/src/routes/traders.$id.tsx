import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Radio, UserPlus, Share2, Users, UserCheck } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Sparkline } from "@/components/market/Sparkline";
import { TraderAvatar } from "@/components/traders/TraderAvatar";
import { ReputationBadge } from "@/components/traders/ReputationBadge";
import { StakePanel } from "@/components/traders/StakePanel";
import { PotCard } from "@/components/traders/PotCard";
import { toast } from "sonner";
import { B3TR, XP } from "@/components/Token";
import { useTrader, usePots } from "@/lib/queries";

function copyText(text: string) {
  navigator.clipboard.writeText(text);
}

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

export const Route = createFileRoute("/traders/$id")({
  head: () => ({
    meta: [
      { title: "Trader — BetterFun" },
      { name: "description", content: "Trader profile on BetterFun." },
    ],
  }),
  component: TraderProfile,
});

function TraderProfile() {
  const { id } = Route.useParams();
  const { data: t, isLoading, error } = useTrader(id);
  const { data: pots = [] } = usePots({ traderId: id });
  const [following, setFollowing] = useState(false);

  const onFollow = () => setFollowing((v) => !v);

  const onShare = async () => {
    copyText(window.location.href);
    toast.success("Profile link copied");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Navbar />
        <div className="mx-auto flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading trader...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !t) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Navbar />
        <div className="mx-auto flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <h1 className="text-xl font-semibold">Trader not found</h1>
          <Link to="/traders" className="text-link hover:underline">
            Back to traders
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const positive = (t.pnl30 ?? 0) >= 0;

  const stats = [
    { label: "30D PnL", value: `${(t.pnl30 ?? 0) >= 0 ? "+" : ""}${(t.pnl30 ?? 0).toFixed(1)}%`, tone: (t.pnl30 ?? 0) >= 0 ? "up" : "down" },
    { label: "Win rate", value: `${t.winRate}%`, tone: "muted" },
    { label: "Followers", value: fmtFollowers(t.followers ?? 0), tone: "muted" },
    { label: "AUM", value: <B3TR amount={t.aum ?? 0} compact iconSize={16} />, tone: "muted" },
    { label: "XP points", value: <XP amount={traderXp(t as any)} compact iconSize={16} />, tone: "muted" },
    { label: "Reputation", value: `${t.reputation ?? 0}`, tone: "muted" },
  ] as const;

  const equityCurve = Array.from({ length: 20 }, (_, i) => {
    const tt = i / 19;
    return 50 + (t.pnl30 ?? 0) * tt + Math.sin(i * 1.3) * Math.abs(t.pnl30 ?? 0) * 0.05;
  });

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full min-h-[80vh] max-w-[1200px] flex-1 px-4 py-6">
        <Link
          to="/traders"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to traders
        </Link>

        {t.isLive && (
          <Link
            to="/live/$id"
            params={{ id: t.id }}
            className="mb-4 flex items-center gap-3 rounded-xl border border-down/30 bg-down/10 px-4 py-3 transition-colors hover:bg-down/15"
          >
            <span className="flex items-center gap-1.5 rounded-full bg-down px-2.5 py-1 text-xs font-bold uppercase text-down-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-down-foreground" /> Live
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {t.bio}
            </span>
            <span className="num hidden shrink-0 text-xs text-muted-foreground sm:block">
              {fmtFollowers(t.followers ?? 0)} followers
            </span>
          </Link>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0">
            {/* Header */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-4">
                <TraderAvatar name={t.name} size={64} live={t.isLive} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-bold tracking-tight">{t.name}</h1>
                    <ReputationBadge score={t.reputation ?? 0} />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    @{t.handle} · {t.country}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(t.tags ?? []).map((tag: string) => (
                      <span
                        key={tag}
                        className="rounded-full bg-secondary/70 px-2 py-0.5 text-xs font-medium text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm text-foreground/90">{t.bio}</p>
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={onFollow}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground shadow-block-outline transition-all duration-150 hover:bg-secondary/60 active:translate-y-[3px] active:shadow-none"
                >
                  {following ? (
                    <>
                      <UserCheck className="h-4 w-4" /> Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" /> Follow
                    </>
                  )}
                </button>
                <button
                  onClick={onShare}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  aria-label="Share"
                >
                  <Share2 className="h-4 w-4" />
                </button>
                {t.isLive && (
                  <Link
                    to="/live/$id"
                    params={{ id: t.id }}
                    className="ml-auto flex items-center gap-1.5 rounded-lg bg-down px-4 py-2 text-sm font-semibold text-down-foreground transition-all hover:brightness-110"
                  >
                    <Radio className="h-4 w-4" /> Watch live
                  </Link>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {stats.map((s) => (
                <div key={s.label} className="rounded-xl border border-border bg-card p-4">
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div
                    className={`num mt-1 text-lg font-bold ${
                      s.tone === "up"
                        ? "text-up"
                        : s.tone === "down"
                          ? "text-down"
                          : "text-foreground"
                    }`}
                  >
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Equity curve */}
            <div className="mt-5 rounded-xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Equity curve</h2>
                <span className="text-xs text-muted-foreground">Last 48 sessions</span>
              </div>
              <div className="h-56 w-full">
                <Sparkline
                  data={equityCurve}
                  color={positive ? "hsl(var(--up))" : "hsl(var(--down))"}
                  height={220}
                />
              </div>
            </div>

            {pots.length > 0 && (
              <div className="mt-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">Epoch pots</h2>
                  <Link to="/pots" className="text-xs font-semibold text-link hover:underline">
                    All pots
                  </Link>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {pots.map((p) => (
                    <PotCard key={p.id} pot={p} compactStrategy />
                  ))}
                </div>
              </div>
            )}

            {/* Recent pots */}
            <div className="mt-5 rounded-xl border border-border bg-card">
              <div className="border-b border-border px-4 py-3 text-sm font-semibold">
                Epoch pots
              </div>
              <div className="divide-y divide-border">
                {pots.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No pots yet.
                  </div>
                ) : (
                  pots.slice(0, 6).map((p) => (
                    <Link
                      key={p.id}
                      to="/pots/$id"
                      params={{ id: p.id }}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/30"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {p.strategy?.title ?? "Pot"}
                      </span>
                      <span className="num text-sm font-semibold text-foreground">
                        ${Number(p.nav).toLocaleString()}
                      </span>
                      <span className="text-xs capitalize text-muted-foreground">{p.status}</span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right rail */}
          <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <StakePanel trader={t} />
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Users className="h-4 w-4 text-muted-foreground" /> Community
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground">
                {fmtFollowers(t.followers ?? 0)} followers copy {t.name}, with{" "}
                <B3TR amount={t.aum ?? 0} compact iconSize={13} className="font-semibold text-foreground" />{" "}
                staked across {pots.length.toLocaleString()} pots.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
