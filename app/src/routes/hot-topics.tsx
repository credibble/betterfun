import { createFileRoute } from "@tanstack/react-router";
import { Flame, TrendingUp, ArrowUpRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { B3TR } from "@/components/Token";
import { useMarkets } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/hot-topics")({
  head: () => ({
    meta: [
      { title: "Hot Topics — Trending Prediction Markets | BetterFun" },
      {
        name: "description",
        content:
          "The most active prediction markets on BetterFun right now, ranked by 24h volume.",
      },
      { property: "og:title", content: "Hot Topics — Trending Markets | BetterFun" },
      {
        property: "og:description",
        content: "See what's trending: the top prediction markets ranked by volume.",
      },
    ],
  }),
  component: HotTopicsPage,
});

function HotTopicsPage() {
  const { data: markets = [], isLoading } = useMarkets();

  const sorted = [...markets]
    .filter((m: any) => m.active)
    .sort((a: any, b: any) => (b.volume ?? 0) - (a.volume ?? 0))
    .slice(0, 20);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full min-h-[80vh] max-w-[900px] flex-1 px-4 py-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
            <Flame className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Hot topics</h1>
            <p className="text-sm text-muted-foreground">
              The most active markets right now, ranked by 24h volume.
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="hidden items-center gap-3 border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:flex">
            <span className="w-6">#</span>
            <span className="flex-1">Market</span>
            <span className="w-28 text-right">Volume</span>
          </div>

          {isLoading ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading markets…</div>
          ) : sorted.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No active markets yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {sorted.map((m: any, i: number) => (
                <div
                  key={m.id}
                  className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/40"
                >
                  <span className="num w-6 shrink-0 text-sm font-bold text-muted-foreground">
                    {i + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {m.symbol}
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <span className="mt-0.5 inline-block rounded-full bg-secondary/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {m.asset}
                    </span>
                  </div>

                  <B3TR
                    amount={m.volume ?? 0}
                    iconSize={13}
                    className="w-28 shrink-0 justify-end text-sm text-muted-foreground"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
