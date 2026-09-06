import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  LayoutDashboard,
  LineChart,
  Maximize2,
  Minimize2,
  Plus,
  Radio,
  Search,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { EpochPhaseBadge } from "@/components/traders/EpochPhaseBadge";
import { LiveChat } from "@/components/traders/LiveChat";
import { LiveVideoPlayer } from "@/components/traders/LiveVideoPlayer";
import { TraderAvatar } from "@/components/traders/TraderAvatar";
import { MarketCard } from "@/components/prediction/MarketCard";
import { TradePanel } from "@/components/prediction/TradePanel";
import { PositionTable } from "@/components/traders/PositionTable";
import { StreamSetupDialog } from "@/components/studio/StreamSetupDialog";
import {
  useMyTrader,
  useEpochs,
  usePots,
  useCreatePot,
  useTrade,
  usePositions,
  useTrades,
  useRestMarkets,
  useSetLive,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import { useWsHub } from "@/lib/use-ws-hub";

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function seedHue(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * 17) % 360;
  return h;
}

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Trader Studio — BetterFun" },
      { name: "description", content: "Trade pots, go live, and grow your following." },
    ],
  }),
  component: StudioPage,
});

type Section = "overview" | "trade" | "followers";

const SECTIONS: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "trade", label: "Trade", icon: LineChart },
  { id: "followers", label: "Followers", icon: Users },
];

function StudioPage() {
  const [section, setSection] = useState<Section>("overview");
  const [live, setLive] = useState(false);
  const [streamTitle, setStreamTitle] = useState("");
  const [setupOpen, setSetupOpen] = useState(false);
  const { data: myTrader, isLoading: traderLoading } = useMyTrader();
  const { data: epochsData } = useEpochs();
  const { data: potsData } = usePots();
  const setLiveMutation = useSetLive();

  const epochs = useMemo(() => (Array.isArray(epochsData) ? epochsData : []), [epochsData]);
  const allPots = useMemo(() => (Array.isArray(potsData) ? potsData : []), [potsData]);

  const trader = myTrader ?? null;
  const myPots = useMemo(
    () => (trader ? allPots.filter((p) => p.traderId === trader.id) : []),
    [allPots, trader],
  );

  // A trader runs one pot per epoch — the "live pot" is their pot in the live epoch.
  const epochById = useMemo(() => new Map(epochs.map((e) => [e.id, e])), [epochs]);
  const livePot = useMemo(() => {
    if (!trader) return null;
    return myPots.find((p) => epochById.get(p.epochId)?.status === "live") ?? null;
  }, [myPots, epochById, trader]);

  // Subscribe to live pot updates via WS hub
  const potChannels = livePot ? [`pot:${livePot.id}`] : [];
  useWsHub(potChannels);

  // Sync the local "live" flag with the persisted profile flag.
  useEffect(() => {
    if (myTrader) setLive(!!myTrader.isLive);
  }, [myTrader?.isLive]); // eslint-disable-line react-hooks/exhaustive-deps

  const room = trader?.handle
    ? `stream-${trader.handle.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}`
    : "";

  const toggleLive = (next: boolean) => {
    setLive(next);
    setLiveMutation.mutate(next, {
      onError: (err: any) => {
        toast.error(err?.message ?? "Failed to update live status");
        setLive(!next);
      },
    });
  };

  if (traderLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Navbar />
        <div className="mx-auto flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading studio…</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!trader) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Navbar />
        <main className="mx-auto flex min-h-[60vh] w-full max-w-[1200px] flex-1 items-center justify-center px-4 py-6">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-bold">No trader profile found</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Create a trader profile to access the studio.
            </p>
            <Link
              to="/become-a-trader/settings"
              className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Create profile
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full min-h-[80vh] max-w-[1200px] flex-1 px-4 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <TraderAvatar name={trader.name} hue={seedHue(trader.id)} avatarUrl={trader.avatarUrl} size={52} live={live} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Trader Studio
              </p>
              <h1 className="text-2xl font-bold tracking-tight">{trader.name}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">@{trader.handle}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/traders/$id"
              params={{ id: trader.id }}
              className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary/60"
            >
              Public profile
            </Link>
            <Link
              to="/become-a-trader/settings"
              className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary/60"
            >
              Settings
            </Link>
            <button
              type="button"
              onClick={() => (live ? toggleLive(false) : setSetupOpen(true))}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all duration-150 active:translate-y-[3px] active:shadow-none",
                live
                  ? "bg-down shadow-block-down hover:brightness-110"
                  : "bg-primary shadow-block-primary hover:brightness-110",
              )}
            >
              <Radio className="h-4 w-4" /> {live ? "End stream" : "Go live"}
            </button>
          </div>
        </div>

        <nav className="mt-6 flex gap-1 overflow-x-auto rounded-lg border border-border bg-secondary/30 p-1">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors",
                section === id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-6">
          {section === "overview" && (
            <OverviewSection
              trader={trader}
              pots={myPots}
              epochs={epochs}
              live={live}
              onGoTrade={() => setSection("trade")}
            />
          )}
          {section === "trade" && (
            <TradeSection
              trader={trader}
              pot={livePot}
              epochStatus={livePot ? (epochById.get(livePot.epochId)?.status ?? "upcoming") : "upcoming"}
              live={live}
              onToggleLive={toggleLive}
              room={room}
              streamTitle={streamTitle}
              setStreamTitle={setStreamTitle}
              setSetupOpen={setSetupOpen}
            />
          )}
          {section === "followers" && <FollowersSection trader={trader} />}
        </div>
      </main>
      <StreamSetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        onConfirm={() => toggleLive(true)}
        traderHandle={trader.handle}
      />
      <Footer />
    </div>
  );
}

function OverviewSection({
  trader,
  pots,
  epochs,
  live,
  onGoTrade,
}: {
  trader: any;
  pots: any[];
  epochs: any[];
  live: boolean;
  onGoTrade: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const potTvl = pots.reduce((s: number, p: any) => s + Number(p.nav), 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Followers" value={fmtFollowers(trader.followers ?? 0)} hint="People following you" />
        <StatCard label="Pot capital" value={formatUsd(potTvl)} hint={`${pots.length} pot${pots.length === 1 ? "" : "s"}`} />
        <StatCard label="Stream" value={live ? "Live now" : "Offline"} hint={live ? "You're on air" : "Ready when you are"} accent={live} />
        <StatCard label="30d PnL" value={`${(trader.pnl30 ?? 0) >= 0 ? "+" : ""}${(trader.pnl30 ?? 0).toFixed(1)}%`} hint="Verified track record" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <QuickAction title="Trade your pot" body="Place orders, run live, and see your pot in action." onClick={onGoTrade} />
        <QuickAction title="Create a pot" body="Open a pot for the next round and set your playbook." onClick={() => setCreating((v) => !v)} />
      </div>

      {creating && <CreatePotForm epochs={epochs} onCreated={() => setCreating(false)} />}

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Your pots</h2>
          <button
            type="button"
            onClick={() => setCreating((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary/60"
          >
            <Plus className="h-3.5 w-3.5" /> New pot
          </button>
        </div>
        <PotsList pots={pots} epochs={epochs} handle={trader.handle} emptyHint="No pots yet — create one for the upcoming round." />
      </div>
    </div>
  );
}

function CreatePotForm({ epochs, onCreated }: { epochs: any[]; onCreated: () => void }) {
  const stakeEpoch = epochs.find((e) => e.status === "upcoming") ?? epochs[0];
  const [epochId, setEpochId] = useState(stakeEpoch?.id ?? "");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [risk, setRisk] = useState<"conservative" | "balanced" | "aggressive">("balanced");
  const [focus, setFocus] = useState("");
  const createPot = useCreatePot();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !note.trim()) {
      toast.error("Add a title and a short note so LPs know your playbook");
      return;
    }
    createPot.mutate(
      {
        epochId,
        strategy: {
          title: title.trim(),
          note: note.trim(),
          risk,
          focus: focus.split(",").map((s) => s.trim()).filter(Boolean),
        },
      },
      {
        onSuccess: () => {
          toast.success("Pot created");
          setTitle("");
          setNote("");
          setFocus("");
          onCreated();
        },
        onError: (err: any) => toast.error(err?.message ?? "Failed to create pot"),
      },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 className="text-lg font-bold">Create a pot</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Pick a round, describe how you'll trade, and open the pot for people to join.
        </p>
      </div>

      <label className="block">
        <span className="text-sm font-semibold">Round</span>
        <select
          value={epochId}
          onChange={(e) => setEpochId(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm outline-none focus:border-primary/50"
        >
          {epochs
            .filter((e) => e.status === "upcoming" || e.status === "live")
            .map((e) => (
              <option key={e.id} value={e.id}>
                Epoch #{e.number} — {e.status === "upcoming" ? "open to join" : "live"}
              </option>
            ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-semibold">Strategy title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Crypto momentum · short horizon"
          className="mt-1.5 w-full rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
        />
      </label>

      <label className="block">
        <span className="text-sm font-semibold">How you'll trade</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="A plain-language note so joiners know your playbook before they put money in."
          className="mt-1.5 w-full resize-y rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
        />
      </label>

      <div>
        <span className="text-sm font-semibold">Risk style</span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {(["conservative", "balanced", "aggressive"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRisk(r)}
              className={cn(
                "rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition-colors",
                risk === r
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:bg-secondary/50",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="text-sm font-semibold">Focus tags</span>
        <input
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          placeholder="Crypto, Momentum, 1× (comma-separated)"
          className="mt-1.5 w-full rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
        />
      </label>

      <button
        type="submit"
        disabled={createPot.isPending}
        className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-block-primary transition-all duration-150 hover:brightness-110 active:translate-y-[3px] active:shadow-none disabled:opacity-50"
      >
        {createPot.isPending ? "Creating…" : "Open pot"}
      </button>
    </form>
  );
}

function PotsList({ pots, epochs, handle, emptyHint }: { pots: any[]; epochs: any[]; handle?: string; emptyHint: string }) {
  if (pots.length === 0) {
    return (
      <p className="mt-3 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyHint}
      </p>
    );
  }
  return (
    <ul className="mt-3 space-y-2">
      {pots.map((pot) => {
        const epoch = epochs?.find((e) => e.id === pot.epochId);
        const slug = handle ?? pot.id;
        return (
          <li
            key={pot.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{pot.strategy?.title ?? "Pot"}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {epoch ? `Epoch #${epoch.number}` : pot.epochId} · {formatUsd(pot.nav)} in pot
              </p>
            </div>
            <div className="flex items-center gap-2">
              {epoch && <EpochPhaseBadge phase={epoch.status} />}
              <Link
                to="/pots/$id"
                params={{ id: slug }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-link hover:underline"
              >
                View <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function TradeSection({
  trader,
  pot,
  epochStatus,
  live,
  onToggleLive,
  room,
  streamTitle,
  setStreamTitle,
  setSetupOpen,
}: {
  trader: any;
  pot: any;
  epochStatus: string;
  live: boolean;
  onToggleLive: (next: boolean) => void;
  room: string;
  streamTitle: string;
  setStreamTitle: (v: string) => void;
  setSetupOpen: (v: boolean) => void;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const [marketId, setMarketId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const trade = useTrade();
  const { data: markets = [] } = useRestMarkets();
  const allMarkets = Array.isArray(markets) ? markets : [];
  const tradingMarkets = allMarkets.filter(
    (m) => m.status === "trading" || m.status === "locked",
  );
  const { data: positions = [] } = usePositions(pot?.id ?? "");
  const { data: trades = [] } = useTrades(pot?.id ?? "");

  const selectedMarket = tradingMarkets.find((m) => m.id === marketId);

  const filteredMarkets = tradingMarkets.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.symbol?.toLowerCase().includes(q) ||
      m.question?.toLowerCase().includes(q) ||
      m.asset?.toLowerCase().includes(q)
    );
  });

  const onTrade = (input: { side: "buy_up" | "buy_down" | "sell_up" | "sell_down"; sizeUsd: number; maxPrice?: number }) => {
    if (!pot) {
      toast.error("No tradable pot in this epoch yet");
      return;
    }
    if (!marketId) {
      toast.error("Select a market");
      return;
    }
    trade.mutate(
      { potId: pot.id, marketId, side: input.side, sizeUsd: input.sizeUsd, maxPrice: input.maxPrice },
      {
        onSuccess: (res) => {
          toast.success(`${input.side.replace("_", " ")}: ${res.filled.toFixed(2)} filled @ $${res.price.toFixed(3)}`);
        },
        onError: (err: any) => toast.error(err?.message ?? "Trade failed"),
      },
    );
  };

  if (!pot) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-14 text-center">
        <p className="text-sm text-muted-foreground">
          You have no pot in the live epoch. Open a pot for the upcoming round and it will become
          tradable here when it goes live.
        </p>
        <Link
          to="/epochs"
          className="mt-4 inline-block rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary/60"
        >
          View epoch calendar
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pot header + live controls */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-bold">{pot.strategy?.title ?? "Pot"}</h2>
              <EpochPhaseBadge phase={epochStatus} />
              {live && (
                <span className="flex items-center gap-1 rounded bg-down/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-down">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-down" /> Live
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              NAV {formatUsd(pot.nav)} · Cash {formatUsd(pot.cash)} · At work{" "}
              {pot.nav > 0 ? `${Math.round((pot.deployed / pot.nav) * 100)}%` : "—"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {live ? (
              <button
                type="button"
                onClick={() => onToggleLive(false)}
                className="flex items-center gap-1.5 rounded-lg bg-down px-4 py-2 text-sm font-semibold text-down-foreground shadow-block-down transition-all duration-150 hover:brightness-110 active:translate-y-[3px] active:shadow-none"
              >
                <Radio className="h-4 w-4" /> End stream
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSetupOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-block-primary transition-all duration-150 hover:brightness-110 active:translate-y-[3px] active:shadow-none"
              >
                <Radio className="h-4 w-4" /> Start live trade
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search markets... BTC, ETH, or question keywords"
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main layout: Markets grid + Trade panel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
        {/* Left: Markets grid */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filteredMarkets.map((m) => {
              const expiryMs = m.expiry ? new Date(m.expiry).getTime() : undefined;
              return (
                <MarketCard
                  key={m.id}
                  symbol={m.symbol ?? ""}
                  question={m.question}
                  strike={m.strike}
                  expiryMs={expiryMs}
                  upPrice={Number(m.upPrice)}
                  downPrice={Number(m.downPrice)}
                  volume={Number(m.volume)}
                  status={m.status}
                  onClick={() => setMarketId(m.id)}
                  className={cn(
                    marketId === m.id && "ring-2 ring-primary/50",
                  )}
                />
              );
            })}
          </div>

          {/* Positions */}
          {(Array.isArray(positions) ? positions : []).length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h4 className="mb-2 text-sm font-semibold">Open Positions</h4>
              <PositionTable
                positions={(Array.isArray(positions) ? positions : []).map((p: any) => {
                  const mkt = tradingMarkets.find((m) => m.id === p.marketId);
                  return {
                    ...p,
                    symbol: mkt?.symbol ?? p.symbol ?? "Unknown",
                  };
                })}
                currentPrices={Object.fromEntries(
                  tradingMarkets.map((m) => [
                    m.id,
                    { up: Number(m.upPrice), down: Number(m.downPrice) },
                  ]),
                )}
                onCashout={async (marketId, side, sizeUsd) => {
                  if (!pot) throw new Error("No tradable pot");
                  const res = await trade.mutateAsync({
                    potId: pot.id,
                    marketId,
                    side,
                    sizeUsd,
                  });
                  toast.success(`Cashout: ${res.filled.toFixed(2)} filled @ $${res.price.toFixed(3)}`);
                }}
              />
            </div>
          )}

          {/* Recent trades */}
          {(Array.isArray(trades) ? trades : []).length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h4 className="mb-2 text-sm font-semibold">Recent Trades</h4>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground">
                      <th className="pb-1 pr-2 text-left font-semibold">Market</th>
                      <th className="pb-1 pr-2 text-left font-semibold">Side</th>
                      <th className="pb-1 pr-2 text-right font-semibold">Qty</th>
                      <th className="pb-1 text-right font-semibold">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(trades) ? trades : []).slice(0, 10).map((t: any) => {
                      const mkt = tradingMarkets.find((m) => m.id === t.marketId);
                      return (
                        <tr key={t.id} className="border-t border-border/30">
                          <td className="py-1.5 pr-2 text-muted-foreground">{mkt?.symbol?.split("-")[0] ?? "—"}</td>
                          <td className={cn("py-1.5 pr-2 font-semibold capitalize", t.side?.includes("up") ? "text-up" : "text-down")}>
                            {t.side?.replace("_", " ") ?? "—"}
                          </td>
                          <td className="py-1.5 pr-2 text-right tabular-nums">{Number(t.quantity).toFixed(2)}</td>
                          <td className="py-1.5 text-right tabular-nums">${Number(t.price).toFixed(3)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right: Trade panel + Stream */}
        <div className="space-y-4">
          {selectedMarket ? (
            <TradePanel
              symbol={selectedMarket.symbol ?? ""}
              question={selectedMarket.question}
              upPrice={Number(selectedMarket.upPrice)}
              downPrice={Number(selectedMarket.downPrice)}
              cash={Number(pot?.cash ?? 0)}
              isPending={trade.isPending}
              onSubmit={onTrade}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">Select a market to trade</p>
              <p className="mt-1 text-xs text-muted-foreground/70">Click any market card on the left</p>
            </div>
          )}

          {/* Stream */}
          <div className={cn(fullscreen && "fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4")}>
            <div className={cn("relative rounded-xl overflow-hidden", fullscreen ? "h-full w-full max-w-4xl" : "h-56")}>
              <LiveVideoPlayer room={room} className={fullscreen ? "h-full w-full" : "h-56"} />
              <button
                type="button"
                onClick={() => setFullscreen((v) => !v)}
                className="absolute right-2 top-2 z-20 rounded-md bg-black/60 p-1.5 text-white hover:bg-black/80"
                aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Live chat */}
      <LiveChat className="h-[420px]" />
    </div>
  );
}

function FollowersSection({ trader }: { trader: any }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Followers</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {fmtFollowers(trader.followers ?? 0)} people follow you.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-1">
        <StatCard label="Total" value={fmtFollowers(trader.followers ?? 0)} hint="All-time follows" />
      </div>

      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        <li className="px-4 py-6 text-center text-sm text-muted-foreground">
          Follower details coming soon.
        </li>
      </ul>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-xl font-bold", accent && "text-down")}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function QuickAction({
  title,
  body,
  onClick,
}: {
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
    >
      <p className="text-sm font-bold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </button>
  );
}