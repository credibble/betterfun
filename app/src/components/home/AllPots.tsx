import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { PotCard } from "@/components/traders/PotCard";
import { usePots, useTraders, useEpochs } from "@/lib/queries";

const filters = ["All", "Funding", "Live", "Settled"] as const;

export function AllPots() {
  const [filter, setFilter] = useState<string>("All");
  const [limit, setLimit] = useState(8);

  const { data: pots = [] } = usePots();
  const { data: traders = [] } = useTraders();
  const { data: epochs = [] } = useEpochs();

  const epochById = useMemo(() => {
    const m = new Map<string, { status: string }>();
    (Array.isArray(epochs) ? epochs : []).forEach((e) => m.set(e.id, { status: e.status }));
    return m;
  }, [epochs]);

  const traderById = useMemo(() => {
    const m = new Map<string, { name: string; handle?: string; isLive?: boolean }>();
    (Array.isArray(traders) ? traders : []).forEach((t) => m.set(t.id, { name: t.name, handle: t.handle, isLive: t.isLive }));
    return m;
  }, [traders]);

  const list = useMemo(() => {
    let items = Array.isArray(pots) ? pots : [];
    if (filter === "Funding") items = items.filter((p) => epochById.get(p.epochId)?.status === "upcoming");
    else if (filter === "Live") items = items.filter((p) => epochById.get(p.epochId)?.status === "live" || epochById.get(p.epochId)?.status === "settling");
    else if (filter === "Settled") items = items.filter((p) => epochById.get(p.epochId)?.status === "settled");
    return [...items].sort((a, b) => b.nav - a.nav);
  }, [pots, filter, epochById]);

  const shown = list.slice(0, limit);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Trader pots</h2>
      </div>

      <div className="scroll-thin -mx-1 mb-4 flex items-center gap-2 overflow-x-auto px-1 pb-1">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setLimit(8);
            }}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              filter === f
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
          No pots match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((pot) => (
            <PotCard
              key={pot.id}
              pot={{
                id: pot.id,
                traderId: pot.traderId,
                epochId: pot.epochId,
                strategy: pot.strategy,
                nav: pot.nav,
                traderName: traderById.get(pot.traderId)?.name,
                handle: traderById.get(pot.traderId)?.handle,
              }}
            />
          ))}
        </div>
      )}

      {limit < list.length && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setLimit((l) => l + 8)}
            className="rounded-full border border-border bg-card px-6 py-2.5 text-sm font-semibold text-foreground shadow-block-outline transition-all duration-150 hover:bg-secondary/60 active:translate-y-[3px] active:shadow-none"
          >
            Show more pots
          </button>
        </div>
      )}
    </section>
  );
}