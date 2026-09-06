import { Link } from "@tanstack/react-router";
import { ArrowRight, Radio } from "lucide-react";
import { TraderAvatar } from "@/components/traders/TraderAvatar";
import { StrategyInfoNote } from "@/components/traders/StrategyInfoNote";
import { usePots, useTraders, useEpochs } from "@/lib/queries";

function seedHue(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * 17) % 360;
  return h;
}

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export function FeaturedPots() {
  const { data: pots = [] } = usePots();
  const { data: traders = [] } = useTraders();
  const { data: epoch } = useEpochs();

  const potList = Array.isArray(pots) ? pots : [];
  const traderList = Array.isArray(traders) ? traders : [];

  const traderById = new Map(traderList.map((t) => [t.id, t]));
  const epochList = Array.isArray(epoch) ? epoch : [];
  const epochById = new Map(epochList.map((e) => [e.id, e]));
  const live = potList.find((p) => epochById.get(p.epochId)?.status === "live") ?? potList.find((p) => epochById.get(p.epochId)?.status === "upcoming");
  const featured = live ?? potList[0];
  const activeEpoch = epochList.find((e) => e.status === "live") ?? epochList[0];

  if (!featured) {
    return (
      <section className="min-w-0">
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <h2 className="text-lg font-bold tracking-tight">No pots yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Traders create pots each epoch. Follow a trader to back their next pot.
          </p>
          <Link
            to="/traders"
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-link hover:underline"
          >
            Discover traders <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    );
  }

  const trader = traderById.get(featured.traderId);
  const name = trader?.name ?? "Trader";
  const slug = trader?.handle ?? featured.id;
  const hue = seedHue(featured.traderId || featured.id);
  const isLive = epochById.get(featured.epochId)?.status === "live";

  return (
    <section className="min-w-0">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid grid-cols-1 gap-4 p-5 sm:p-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-3">
              <Link to="/pots/$id" params={{ id: slug }} className="shrink-0">
                <TraderAvatar name={name} hue={hue} avatarUrl={trader?.avatarUrl} size={48} live={isLive} />
              </Link>
              <div className="min-w-0">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Featured pot {isLive ? "· LIVE" : "· funding open"}
                </div>
                <Link
                  to="/pots/$id"
                  params={{ id: slug }}
                  className="truncate text-lg font-bold tracking-tight hover:text-primary"
                >
                  {name}
                </Link>
              </div>
              {isLive && (
                <span className="flex items-center gap-1 rounded bg-down/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-down">
                  <Radio className="h-3 w-3" /> Live
                </span>
              )}
            </div>

            <div className="mt-4 min-w-0">
              <p className="text-sm font-semibold text-foreground/80">
                {featured.strategy?.title ?? "Epoch pot"}
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {featured.strategy?.note ?? "Back this trader's pot for the current epoch."}
              </p>
            </div>

            <div className="mt-auto flex items-center justify-between pt-4 text-xs text-muted-foreground">
              <span>
                {activeEpoch ? `Epoch #${activeEpoch.number}` : "Epoch pot"}
              </span>
              <span>{formatUsd(featured.nav)} in the pot</span>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-3">
            {featured.strategy && (
              <StrategyInfoNote strategy={featured.strategy} compact={false} />
            )}
            <div className="flex flex-wrap gap-2">
              <Link
                to="/pots/$id"
                params={{ id: slug }}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-block-primary transition-all duration-150 hover:brightness-110 active:translate-y-[3px] active:shadow-none"
              >
                View pot <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/epochs"
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-secondary/40 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/70"
              >
                Epoch calendar
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}