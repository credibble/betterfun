import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Radio, TrendingUp } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { TraderCard } from "@/components/traders/TraderCard";
import { useTraders } from "@/lib/queries";

export const Route = createFileRoute("/traders/")({
  head: () => ({
    meta: [
      { title: "Traders — Discover & Copy Traders | BetterFun" },
      {
        name: "description",
        content:
          "Discover traders running epoch pots. Stake LP before the window, track live PnL, and watch streams.",
      },
    ],
  }),
  component: TradersPage,
});

const tabs = ["Top PnL", "Reputation", "Live now"] as const;
type Tab = (typeof tabs)[number];

function TradersPage() {
  const [tab, setTab] = useState<Tab>("Top PnL");
  const [query, setQuery] = useState("");
  const { data } = useTraders();
  const allTraders = Array.isArray(data) ? data : [];

  let list = [...allTraders] as any[];
  if (tab === "Reputation") {
    list.sort((a: any, b: any) => (b.reputation ?? 0) - (a.reputation ?? 0));
  } else if (tab === "Live now") {
    list = list.filter((t: any) => t.isLive);
  } else {
    list.sort((a: any, b: any) => (b.pnl30 ?? 0) - (a.pnl30 ?? 0));
  }

  const q = query.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (t: any) =>
        t.name.toLowerCase().includes(q) ||
        t.handle.toLowerCase().includes(q) ||
        (t.tags ?? []).some((tag: string) => tag.toLowerCase().includes(q)),
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full min-h-[80vh] max-w-[1200px] flex-1 px-4 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Traders</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Discover traders running epoch pots. Stake LP before the window, track live PnL.
            </p>
          </div>
          <Link
            to="/become-a-trader"
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-block-primary transition-all duration-150 hover:brightness-110 active:translate-y-[3px] active:shadow-none"
          >
            Become a trader
          </Link>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-secondary/50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mt-3 relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search traders…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-secondary/50 pl-9 pr-3 text-sm"
          />
        </div>

        {/* Trader cards */}
        {list.length === 0 ? (
          <div className="mt-12 rounded-xl border border-border bg-card py-16 text-center">
            <TrendingUp className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-semibold text-foreground">No traders found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {allTraders.length === 0
                ? "No traders have joined yet."
                : "No traders match your filters."}
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((t: any) => (
              <TraderCard key={t.id} trader={t} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
