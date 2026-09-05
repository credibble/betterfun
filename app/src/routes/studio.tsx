import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Eye,
  Layers,
  LayoutDashboard,
  LineChart,
  Mic,
  MicOff,
  Plus,
  Radio,
  Signal,
  Users,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { EpochPhaseBadge } from "@/components/traders/EpochPhaseBadge";
import { LiveChat } from "@/components/traders/LiveChat";
import { LiveVideoPlayer } from "@/components/traders/LiveVideoPlayer";
import { TraderAvatar } from "@/components/traders/TraderAvatar";
import { StreamSetupDialog } from "@/components/studio/StreamSetupDialog";
import {
  useMyTrader,
  useEpochs,
  usePots,
  useCreatePot,
  useTrade,
  useOrders,
  useCancelOrder,
  usePositions,
  useTrades,
  useRestMarkets,
} from "@/lib/queries";
import { cn } from "@/lib/utils";

function fmtFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

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

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Trader Studio — BetterFun" },
      {
        name: "description",
        content:
          "Manage your pots, go live, and see your followers from Trader Studio on BetterFun.",
      },
    ],
  }),
  component: StudioPage,
});

type Section = "home" | "pots" | "create" | "trade" | "live" | "followers";

const SECTIONS: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "home", label: "Overview", icon: LayoutDashboard },
  { id: "pots", label: "My pots", icon: Layers },
  { id: "create", label: "Create pot", icon: Plus },
  { id: "trade", label: "Trade", icon: LineChart },
  { id: "live", label: "Go live", icon: Radio },
  { id: "followers", label: "Followers", icon: Users },
];

function StudioPage() {
  const [section, setSection] = useState<Section>("home");
  const [live, setLive] = useState(false);
  const [streamTitle, setStreamTitle] = useState("");
  const [setupOpen, setSetupOpen] = useState(false);
  const { data: myTrader, isLoading: traderLoading } = useMyTrader();
  const { data: epochsData } = useEpochs();
  const { data: potsData } = usePots();
  const epochs = Array.isArray(epochsData) ? epochsData : [];
  const allPots = Array.isArray(potsData) ? potsData : [];

  const trader = useMemo(() => {
    return myTrader ?? null;
  }, [myTrader]);

  const myPots = useMemo(() => trader ? allPots.filter((p) => p.traderId === trader.id) : [], [allPots, trader]);

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
            <a
              href="/become-a-trader"
              className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Become a trader
            </a>
          </div>
        </main>
      </div>
    );
  }
  const potTvl = myPots.reduce((s, p) => s + p.nav, 0);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full min-h-[80vh] max-w-[1200px] flex-1 px-4 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <TraderAvatar
              name={trader.name}
              hue={seedHue(trader.id ?? "")}
              size={52}
              live={live}
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Trader Studio
              </p>
              <h1 className="text-2xl font-bold tracking-tight">{trader.name}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Manage pots, go live, and grow your following.
              </p>
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
              onClick={() => setSection("live")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all duration-150 active:translate-y-[3px] active:shadow-none",
                live
                  ? "bg-down shadow-block-down hover:brightness-110"
                  : "bg-primary shadow-block-primary hover:brightness-110",
              )}
            >
              {live ? "On air" : "Go live"}
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
          {section === "home" && (
            <OverviewSection
              trader={trader}
              pots={myPots}
              potCount={myPots.length}
              potTvl={potTvl}
              live={live}
              onNavigate={setSection}
            />
          )}
          {section === "pots" && (
            <MyPotsSection pots={myPots} epochs={epochs} onCreate={() => setSection("create")} />
          )}
          {section === "create" && (
            <CreatePotSection
              trader={trader}
              epochs={epochs}
              onCreated={() => setSection("pots")}
            />
          )}
          {section === "trade" && (
            <TradingSection trader={trader} pots={myPots} />
          )}
          {section === "live" && <LiveSection trader={trader} live={live} setLive={setLive} streamTitle={streamTitle} setStreamTitle={setStreamTitle} setSetupOpen={setSetupOpen} setupOpen={setupOpen} />}
          {section === "followers" && <FollowersSection trader={trader} />}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function TradingSection({ trader, pots }: { trader: any; pots: any[] }) {
  const livePots = pots.filter((p) => p.status === "live" || p.status === "funding");
  const [potId, setPotId] = useState(livePots[0]?.id ?? pots[0]?.id ?? "");
  const [marketId, setMarketId] = useState("");
  const [side, setSide] = useState<"buy_up" | "buy_down" | "sell_up" | "sell_down">("buy_up");
  const [sizeUsd, setSizeUsd] = useState(0);
  const [maxPrice, setMaxPrice] = useState("");
  const [orderType, setOrderType] = useState<"ioc" | "post_only" | "limit">("ioc");

  const trade = useTrade();
  const cancel = useCancelOrder();
  const { data: markets = [] } = useRestMarkets();
  const tradingMarkets = (Array.isArray(markets) ? markets : []).filter(
    (m) => m.status === "trading",
  );
  const { data: orders = [] } = useOrders(potId);
  const { data: positions = [] } = usePositions(potId);
  const { data: trades = [] } = useTrades(potId);

  const selectedMarket = tradingMarkets.find((m) => m.id === marketId);

  const onTrade = () => {
    if (!potId) {
      toast.error("Select a pot to trade");
      return;
    }
    if (!marketId) {
      toast.error("Select a market");
      return;
    }
    if (sizeUsd <= 0) {
      toast.error("Enter a size");
      return;
    }
    trade.mutate(
      {
        potId,
        marketId,
        side,
        sizeUsd,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        orderType,
      },
      {
        onSuccess: (res) => {
          toast.success(`Order placed: ${side} ${res.filled.toFixed(2)} contracts`);
          setSizeUsd(0);
        },
        onError: (err: any) => toast.error(err?.message ?? "Trade failed"),
      },
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">Trade a pot</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Place price-capped IOC orders on live BTC/ETH event markets using pot capital.
        </p>
      </div>

      {livePots.length === 0 && pots.length === 0 && (
        <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No pots yet — create one in the pot section, then come back to trade.
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Order form */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-semibold">Pot</span>
              <select
                value={potId}
                onChange={(e) => setPotId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm outline-none focus:border-primary/50"
              >
                {potId === "" && <option value="">Select a pot</option>}
                {livePots.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.strategy?.title ?? "Pot"} · {p.status} · ${Number(p.nav).toFixed(2)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold">Market</span>
              <select
                value={marketId}
                onChange={(e) => setMarketId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm outline-none focus:border-primary/50"
              >
                {marketId === "" && <option value="">Select a live market</option>}
                {tradingMarkets.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.symbol} · UP {m.upPrice != null ? (Number(m.upPrice) * 100).toFixed(0) : "—"}%
                  </option>
                ))}
              </select>
              {selectedMarket && (
                <span className="mt-1 block text-xs text-muted-foreground">
                  YES {selectedMarket.upSymbol} · NO {selectedMarket.downSymbol} ·{" "}
                  {new Date(selectedMarket.expiry).toLocaleString()}
                </span>
              )}
            </label>

            <div>
              <span className="text-sm font-semibold">Side</span>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {(["buy_up", "buy_down", "sell_up", "sell_down"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSide(s)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition-colors",
                      side === s
                        ? s.includes("buy")
                          ? "border-up/40 bg-up/10 text-foreground"
                          : "border-down/40 bg-down/10 text-foreground"
                        : "border-border text-muted-foreground hover:bg-secondary/50",
                    )}
                  >
                    {s.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-semibold">Size (USDC)</span>
                <input
                  type="number"
                  min={0}
                  value={sizeUsd || ""}
                  placeholder="0"
                  onChange={(e) => setSizeUsd(Math.max(0, Number(e.target.value) || 0))}
                  className="mt-1.5 w-full rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Max price (optional)</span>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={maxPrice}
                  placeholder="0.60"
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-semibold">Order type</span>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as any)}
                className="mt-1.5 w-full rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm outline-none focus:border-primary/50"
              >
                <option value="ioc">IOC — fill what crosses, cancel the rest</option>
                <option value="post_only">Post-only — rest, never take</option>
                <option value="limit">Limit — fill & rest remainder</option>
              </select>
            </label>

            <button
              type="button"
              onClick={onTrade}
              disabled={trade.isPending}
              className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-block-primary transition-all duration-150 hover:brightness-110 active:translate-y-[3px] active:shadow-none disabled:opacity-50"
            >
              {trade.isPending ? "Placing order…" : "Place order"}
            </button>
          </div>
        </div>

        {/* Positions + open orders */}
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold">Positions</h3>
            {positions.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No open positions.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {positions.map((p: any) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/20 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{p.symbol ?? p.marketId}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {p.side} · {Number(p.contracts).toFixed(2)} contracts
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="num font-bold">${Number(p.avgPrice).toFixed(3)}</p>
                      <p className="text-[11px] text-muted-foreground">avg</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold">Open orders</h3>
            {orders.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No resting orders.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {orders.map((o: any) => (
                  <li
                    key={o.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/20 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{o.symbol ?? o.marketId}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {o.side} · ${Number(o.price).toFixed(3)} · {Number(o.filled).toFixed(2)}/{Number(o.quantity).toFixed(2)} filled
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        cancel.mutate({ potId, orderId: o.id }, {
                          onSuccess: () => toast.success("Order cancelled"),
                          onError: (err: any) => toast.error(err?.message ?? "Cancel failed"),
                        })
                      }
                      disabled={cancel.isPending}
                      className="flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" /> Cancel
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold">Recent trades</h3>
            {trades.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No trades yet.</p>
            ) : (
              <ul className="mt-3 space-y-1">
                {trades.slice(0, 8).map((t: any) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 py-1 text-sm"
                  >
                    <span className="min-w-0 truncate capitalize text-muted-foreground">
                      {t.side} · {Number(t.quantity).toFixed(2)}
                    </span>
                    <span className="num text-foreground">${Number(t.price).toFixed(3)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewSection({
  trader,
  pots,
  potCount,
  potTvl,
  live,
  onNavigate,
}: {
  trader: any;
  pots: any[];
  potCount: number;
  potTvl: number;
  live: boolean;
  onNavigate: (s: Section) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Followers"
          value={fmtFollowers(trader.followers ?? 0)}
          hint="People watching your book"
        />
        <StatCard
          label="Pot capital"
          value={formatUsd(potTvl)}
          hint={`${potCount} pot${potCount === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Stream"
          value={live ? "Live now" : "Offline"}
          hint={live ? "You're on air" : "Ready when you are"}
          accent={live}
        />
        <StatCard
          label="30d PnL"
          value={`${(trader.pnl30 ?? 0) >= 0 ? "+" : ""}${(trader.pnl30 ?? 0).toFixed(1)}%`}
          hint="Verified track record"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <QuickAction
          title="Create a pot"
          body="Open a pot for the next round and set your playbook."
          onClick={() => onNavigate("create")}
        />
        <QuickAction
          title="Go live"
          body="Stream your chart and talk through the trade."
          onClick={() => onNavigate("live")}
        />
        <QuickAction
          title="See followers"
          body="Check who's copying and engaging with you."
          onClick={() => onNavigate("followers")}
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Your pots</h2>
          <button
            type="button"
            onClick={() => onNavigate("pots")}
            className="text-xs font-semibold text-link hover:underline"
          >
            Manage all
          </button>
        </div>
        <MyPotsList
          pots={pots}
          emptyHint="No pots yet — create one for the upcoming round."
        />
      </div>
    </div>
  );
}

function MyPotsSection({
  pots,
  epochs,
  onCreate,
}: {
  pots: any[];
  epochs: any[];
  onCreate: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">My pots</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Each pot is tied to one round. Joiners see your name, picture, and strategy note.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-block-primary transition-all duration-150 hover:brightness-110 active:translate-y-[3px] active:shadow-none"
        >
          <Plus className="h-4 w-4" /> New pot
        </button>
      </div>
      <MyPotsList pots={pots} epochs={epochs} emptyHint="You haven't opened a pot yet." />
    </div>
  );
}

function MyPotsList({
  pots,
  epochs,
  emptyHint,
}: {
  pots: any[];
  epochs?: any[];
  emptyHint: string;
}) {
  if (pots.length === 0) {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        {emptyHint}
      </div>
    );
  }

  return (
    <ul className="mt-3 space-y-2">
      {pots.map((pot) => {
        const epoch = epochs?.find((e) => e.id === pot.epochId);
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
                params={{ id: pot.id }}
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

function CreatePotSection({
  trader,
  epochs,
  onCreated,
}: {
  trader: any;
  epochs: any[];
  onCreated: () => void;
}) {
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
        onError: (err: any) => {
          toast.error(err?.message ?? "Failed to create pot");
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-4">
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
        className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-block-primary transition-all duration-150 hover:brightness-110 active:translate-y-[3px] active:shadow-none"
      >
        Open pot
      </button>
      <p className="text-center text-[11px] text-muted-foreground">
        In production this would create an on-chain pot for the selected epoch.
      </p>
    </form>
  );
}

function LiveSection({
  trader,
  live,
  setLive,
  streamTitle,
  setStreamTitle,
  setSetupOpen,
  setupOpen,
}: {
  trader: any;
  live: boolean;
  setLive: (v: boolean) => void;
  streamTitle: string;
  setStreamTitle: (v: string) => void;
  setSetupOpen: (v: boolean) => void;
  setupOpen: boolean;
}) {
  const [cam, setCam] = useState(true);
  const [mic, setMic] = useState(true);
  const [viewers, setViewers] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const room = trader?.handle ? `stream-${trader.handle.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}` : "";

  const goLive = () => {
    const next = !live;
    setLive(next);
    toast[next ? "success" : "message"](next ? "You're live" : "Stream ended", {
      description: next
        ? "Broadcast started — viewers would see your chart and chat."
        : "Back offline.",
    });
  };

  const onGoLiveClick = () => {
    if (live) {
      goLive();
      return;
    }
    setSetupOpen(true);
  };

  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(
    elapsed % 60,
  ).padStart(2, "0")}`;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      <StreamSetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        onConfirm={goLive}
        traderHandle={trader.handle}
      />
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Go live</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Stream your chart, talk through entries, and pull followers into your pots.
            </p>
          </div>
          <button
            type="button"
            onClick={onGoLiveClick}
            className={cn(
              "flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all duration-150 active:translate-y-[3px] active:shadow-none",
              live
                ? "bg-down shadow-block-down hover:brightness-110"
                : "bg-primary shadow-block-primary hover:brightness-110",
            )}
          >
            <Radio className="h-4 w-4" /> {live ? "End stream" : "Go live"}
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="relative border-b border-border bg-gradient-to-b from-secondary/30 to-transparent p-5">
            {!live && (
              <div className="absolute inset-0 z-10 grid place-items-center bg-background/60 backdrop-blur-sm">
                <div className="text-center">
                  <Signal className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium text-muted-foreground">
                    You're offline — hit Go live when you're ready.
                  </p>
                </div>
              </div>
            )}
            {live && (
              <span className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-down px-2.5 py-1 text-xs font-bold uppercase text-down-foreground">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-down-foreground" />
                On air · <span className="num">{mmss}</span>
              </span>
            )}
            <LiveVideoPlayer room={room} className="h-[340px]" />
          </div>

          <div className="flex flex-wrap items-center gap-2 p-4">
            <ControlBtn
              on={cam}
              onClick={() => setCam((v) => !v)}
              onIcon={<Video className="h-4 w-4" />}
              offIcon={<VideoOff className="h-4 w-4" />}
              label="Camera"
            />
            <ControlBtn
              on={mic}
              onClick={() => setMic((v) => !v)}
              onIcon={<Mic className="h-4 w-4" />}
              offIcon={<MicOff className="h-4 w-4" />}
              label="Mic"
            />
            <div className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span className="num text-foreground">{viewers}</span> viewers
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <label className="text-sm font-semibold" htmlFor="stream-title">
            Stream title
          </label>
          <input
            id="stream-title"
            value={streamTitle}
            onChange={(e) => setStreamTitle(e.target.value)}
            placeholder="What are you trading today?"
            className="mt-2 w-full rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
          />
          {live && (
            <Link
              to="/live/$id"
              params={{ id: trader.id }}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-link hover:underline"
            >
              Open public stream view <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      <LiveChat className="h-[560px]" />
    </div>
  );
}

function FollowersSection({ trader }: { trader: any }) {
  const followerCount = trader.followers ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Followers</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {fmtFollowers(followerCount)} people follow you.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-1">
        <StatCard label="Total" value={fmtFollowers(followerCount)} hint="All-time follows" />
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

function ControlBtn({
  on,
  onClick,
  onIcon,
  offIcon,
  label,
}: {
  on: boolean;
  onClick: () => void;
  onIcon: React.ReactNode;
  offIcon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        on
          ? "bg-secondary/70 text-foreground hover:bg-secondary"
          : "bg-down/15 text-down hover:bg-down/20",
      )}
    >
      {on ? onIcon : offIcon} {label}
    </button>
  );
}
