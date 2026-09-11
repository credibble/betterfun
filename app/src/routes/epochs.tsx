import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Users } from "lucide-react";
import TopBar from "@/layouts/TopBar";
import { EpochPhaseBadge } from "@/components/traders/EpochPhaseBadge";
import { useEpochs, useActiveEpoch, usePots } from "@/lib/queries";

type EpochView = {
  id: string;
  number: number;
  startsAt: Date;
  endsAt: Date;
  status: string;
  potCount: number;
  tvl: number;
};

export const Route = createFileRoute("/epochs")({
  head: () => ({
    meta: [
      { title: "Epoch calendar — Trader pots | BetterFun" },
      {
        name: "description",
        content:
          "Browse BetterFun trading rounds. Stake Pot LP before start, follow live 1× pot trading, then settle and unstake after the window ends.",
      },
    ],
  }),
  component: EpochsPage,
});

function EpochsPage() {
  const { data: epochsRaw } = useEpochs();
  const { data: activeEpoch } = useActiveEpoch();
  const epochsData = Array.isArray(epochsRaw) ? epochsRaw : [];

  const epochs: EpochView[] = epochsData.map((e) => ({
    id: e.id,
    number: e.number,
    startsAt: new Date(e.startsAt),
    endsAt: new Date(e.endsAt),
    status: e.status,
    potCount: e.potCount ?? 0,
    tvl: e.tvl ?? 0,
  }));

  const live = activeEpoch
    ? {
        id: activeEpoch.id,
        number: activeEpoch.number,
        startsAt: new Date(activeEpoch.startsAt),
        endsAt: new Date(activeEpoch.endsAt),
        status: activeEpoch.status,
        potCount: activeEpoch.potCount ?? 0,
        tvl: activeEpoch.tvl ?? 0,
      }
    : null;

  const [selectedId, setSelectedId] = useState(live?.id ?? epochs[0]?.id ?? "");
  const selected = useMemo(
    () => epochs.find((e) => e.id === selectedId) ?? live ?? epochs[0] ?? null,
    [selectedId, live, epochs],
  );

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              EpochRegistry
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Epoch calendar
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Copy-trading liquidity is epoch-scoped. Pick a day to see that
              epoch&apos;s pots — stake before start, trade live at 1×, settle when it ends.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/pots"
              className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary/60"
            >
              Browse pots
            </Link>
            <Link
              to="/earn"
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-block-primary transition-all duration-150 hover:brightness-110 active:translate-y-[3px] active:shadow-none"
            >
              Earn / stake LP
            </Link>
          </div>
        </div>

        {live && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedId(live.id)}
              className={
                selectedId === live.id
                  ? "inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm font-semibold"
                  : "inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-secondary/50"
              }
            >
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Live now</span>
              #{live.number}
              <EpochPhaseBadge phase={live.status} />
            </button>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {epochs.map((e) => (
            <button
              key={e.id}
              onClick={() => setSelectedId(e.id)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                selectedId === e.id
                  ? "border-primary/40 bg-primary/5"
                  : "border-border hover:bg-secondary/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold">Epoch #{e.number}</span>
                <EpochPhaseBadge phase={e.status} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {e.startsAt.toLocaleDateString()} → {e.endsAt.toLocaleDateString()}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {e.potCount} pots · TVL ${e.tvl.toLocaleString()}
              </p>
            </button>
          ))}
        </div>

        {selected && <SelectedEpochPanel epoch={selected} />}
      </main>
    </div>
  );
}

function SelectedEpochPanel({ epoch }: { epoch: EpochView }) {
  const { data: pots = [] } = usePots({ epochId: epoch.id });

  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold">Epoch #{epoch.number}</h2>
            <EpochPhaseBadge phase={epoch.status} />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {epoch.startsAt.toLocaleDateString()} → {epoch.endsAt.toLocaleDateString()}
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="text-muted-foreground">TVL</p>
          <p className="font-bold">${epoch.tvl.toLocaleString()}</p>
          <p className="mt-1 text-xs text-muted-foreground">{epoch.potCount} pots</p>
        </div>
      </div>

      {pots.length > 0 ? (
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> Pots in this epoch
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pots.map((p) => (
              <li key={p.id}>
                <Link
                  to="/pots/$id"
                  params={{ id: p.id }}
                  className="block rounded-lg border border-border px-3 py-2.5 text-sm transition-colors hover:border-primary/40 hover:bg-secondary/30"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{p.strategy?.title ?? "Pot"}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    NAV ${Number(p.nav ?? 0).toLocaleString()} · {p.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            No pots for this epoch yet.{" "}
            <Link to="/pots" className="font-semibold text-link hover:underline">
              Browse all pots
            </Link>
          </p>
        </div>
      )}
    </section>
  );
}
