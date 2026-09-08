import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Layers } from "lucide-react";
import TopBar from "@/layouts/TopBar";
import { PotCard } from "@/components/traders/PotCard";
import { EpochPhaseBadge } from "@/components/traders/EpochPhaseBadge";
import { usePots, useEpochs, useActiveEpoch, useTraders } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pots/")({
  head: () => ({
    meta: [
      { title: "Trader Pots — BetterFun" },
      {
        name: "description",
        content:
          "Browse trader pots. See who runs each pot, how they trade, and join before the window opens.",
      },
    ],
  }),
  component: PotsPage,
});

function PotsPage() {
  const { data: epochsData } = useEpochs();
  const { data: activeEpoch } = useActiveEpoch();
  const { data: potsData } = usePots();
  const { data: tradersData } = useTraders();
  const epochs = Array.isArray(epochsData) ? epochsData : [];
  const allPots = Array.isArray(potsData) ? potsData : [];
  const traders = Array.isArray(tradersData) ? tradersData : [];
  const traderMeta = new Map(traders.map((t) => [t.id, { name: t.name, handle: t.handle }]));

  const [query, setQuery] = useState("");
  const [selectedEpoch, setSelectedEpoch] = useState<string>("all");

  const filtered = useMemo(() => {
    let items = allPots as any[];
    if (selectedEpoch !== "all") {
      items = items.filter((p) => p.epochId === selectedEpoch);
    }
    if (query) {
      const q = query.toLowerCase();
      items = items.filter((p) =>
        (p.strategy?.title ?? "").toLowerCase().includes(q)
      );
    }
    return items;
  }, [allPots, selectedEpoch, query]);

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Copy-trading
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Trader pots</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Browse trader pots. Each pot is a copy-trading pool — fund it, and the trader
            executes strategies on DreamDEX with pooled capital.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search pots…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-9 rounded-lg border border-border bg-secondary/50 px-3 text-sm w-48"
        />
        <div className="flex gap-1.5">
          <button
            onClick={() => setSelectedEpoch("all")}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              selectedEpoch === "all"
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-secondary/50",
            )}
          >
            All epochs
          </button>
          {epochs.slice(0, 4).map((e: any) => (
            <button
              key={e.id}
              onClick={() => setSelectedEpoch(e.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                selectedEpoch === e.id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-secondary/50",
              )}
            >
              #{e.number}
              <EpochPhaseBadge phase={e.status} className="ml-1" />
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-12 rounded-xl border border-border bg-card py-16 text-center">
          <Layers className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-semibold text-foreground">No pots found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {allPots.length === 0
              ? "No pots have been created yet."
              : "No pots match your filters."}
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p: any) => (
            <PotCard
              key={p.id}
              pot={{
                ...p,
                traderName: traderMeta.get(p.traderId)?.name,
                handle: traderMeta.get(p.traderId)?.handle,
              }}
            />
          ))}
        </div>
      )}
      </main>
    </div>
  );
}
