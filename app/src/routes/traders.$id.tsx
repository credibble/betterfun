import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Radio,
  Share2,
  Users,
  Heart,
  Bell,
  BellOff,
} from "lucide-react";
import TopBar from "@/layouts/TopBar";
import { Sparkline } from "@/components/market/Sparkline";
import { TraderAvatar } from "@/components/traders/TraderAvatar";
import { ReputationBadge } from "@/components/traders/ReputationBadge";
import { StakePanel } from "@/components/traders/StakePanel";
import { PotCard } from "@/components/traders/PotCard";
import StreamPlayer from "@/components/stream/StreamPlayer";
import StreamChat from "@/components/chat/StreamChat";
import { useStreamViewers } from "@/hooks/use-stream-viewers";
import { hasStreamOverride } from "@/lib/stream-overrides";
import { toast } from "sonner";
import { B3TR, XP } from "@/components/Token";
import {
  useTrader,
  usePots,
  useEpochs,
} from "@/lib/queries";

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
  const { data: epochsData } = useEpochs();
  const epochs = Array.isArray(epochsData) ? epochsData : [];
  const epochById = new Map(epochs.map((e) => [e.id, e]));
  const [notify, setNotify] = useState(false);
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);

  const room = t?.handle ? `stream-${t.handle.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}` : "";
  const { data: viewerData } = useStreamViewers(room);
  const hasOverride = hasStreamOverride(id);
  const isLive = (t?.isLive ?? false) || hasOverride;

  const onShare = async () => {
    copyText(window.location.href);
    toast.success("Profile link copied");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="mx-auto flex flex-1 items-center justify-center pt-20">
          <p className="text-sm text-muted-foreground">Loading trader...</p>
        </div>
      </div>
    );
  }

  if (error || !t) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="mx-auto flex flex-1 flex-col items-center justify-center gap-3 px-4 pt-20 text-center">
          <h1 className="text-xl font-semibold">Trader not found</h1>
          <Link to="/traders" className="text-link hover:underline">
            Back to traders
          </Link>
        </div>
      </div>
    );
  }

  const positive = (t.pnl30 ?? 0) >= 0;

  const stats = [
    {
      label: "30D PnL",
      value: `${(t.pnl30 ?? 0) >= 0 ? "+" : ""}${(t.pnl30 ?? 0).toFixed(1)}%`,
      tone: (t.pnl30 ?? 0) >= 0 ? "up" : "down",
    },
    { label: "Win rate", value: `${t.winRate}%`, tone: "muted" },
    { label: "Followers", value: fmtFollowers(t.followers ?? 0), tone: "muted" },
    { label: "AUM", value: <B3TR amount={t.aum ?? 0} compact iconSize={16} />, tone: "muted" },
    {
      label: "XP points",
      value: <XP amount={traderXp(t)} compact iconSize={16} />,
      tone: "muted",
    },
    { label: "Reputation", value: `${t.reputation ?? 0}`, tone: "muted" },
  ] as const;

  const equityCurve = Array.from({ length: 20 }, (_, i) => {
    const tt = i / 19;
    return 50 + (t.pnl30 ?? 0) * tt + Math.sin(i * 1.3) * Math.abs(t.pnl30 ?? 0) * 0.05;
  });

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Link
          to="/traders"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to traders
        </Link>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0 space-y-5">
            {/* Live stream hero — large embedded player when live */}
            {isLive && (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  <StreamPlayer
                    traderId={id}
                    traderName={t.name ?? "Trader"}
                    isLive={isLive}
                    viewerCount={viewerData?.count ?? 0}
                    className="h-[480px] lg:h-[540px]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TraderAvatar name={t.name} avatarUrl={t.avatarUrl} size={40} live />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{t.name}</span>
                        <ReputationBadge score={t.reputation ?? 0} showScore={false} />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Live trading stream · {fmtFollowers(t.followers ?? 0)} followers
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setLiked((v) => !v);
                        setLikes((n) => n + (liked ? -1 : 1));
                      }}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                        liked
                          ? "bg-primary/15 text-primary"
                          : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} />
                      <span>{likes.toLocaleString()}</span>
                    </button>
                    <Link
                      to="/live/$id"
                      params={{ id }}
                      className="flex items-center gap-1.5 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-red-600"
                    >
                      <Radio className="h-4 w-4" /> Full stream
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Header card (always shown) */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-4">
                <TraderAvatar name={t.name} avatarUrl={t.avatarUrl} size={64} live={t.isLive} />
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
                  onClick={onShare}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  aria-label="Share"
                >
                  <Share2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setNotify((v) => !v)}
                  className={`grid h-9 w-9 place-items-center rounded-lg border border-border transition-colors ${
                    notify
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  }`}
                  aria-label="Notify"
                >
                  {notify ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                </button>
                {isLive && (
                  <Link
                    to="/live/$id"
                    params={{ id }}
                    className="ml-auto flex items-center gap-1.5 rounded-lg bg-down px-4 py-2 text-sm font-semibold text-down-foreground transition-all hover:brightness-110"
                  >
                    <Radio className="h-4 w-4" /> Watch full stream
                  </Link>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
            <div className="rounded-xl border border-border bg-card p-4">
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
              <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">Epoch pots</h2>
                  <Link to="/pots" className="text-xs font-semibold text-link hover:underline">
                    All pots
                  </Link>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {pots.map((p) => (
                    <PotCard
                      key={p.id}
                      pot={{ ...p, traderName: t.name, handle: t.handle }}
                      compactStrategy
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right rail */}
          <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            {/* Live chat (when live) */}
            {isLive && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <StreamChat
                  traderId={id}
                  potId={pots[0]?.id}
                  traderName={t.name ?? "Trader"}
                  className="h-[440px]"
                />
              </div>
            )}
            <StakePanel trader={t} />
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Users className="h-4 w-4 text-muted-foreground" /> Community
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground">
                {fmtFollowers(t.followers ?? 0)} followers copy {t.name}, with{" "}
                <B3TR
                  amount={t.aum ?? 0}
                  compact
                  iconSize={13}
                  className="font-semibold text-foreground"
                />{" "}
                staked across {pots.length.toLocaleString()} pots.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
