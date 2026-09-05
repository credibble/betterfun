import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CircleDollarSign,
  ClipboardList,
  Wallet,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { B3TR } from "@/components/Token";
import { useMarkets, useMe, usePots, useEpochs } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { ComponentType, ReactNode } from "react";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio — Positions & Claims | BetterFun" },
      {
        name: "description",
        content:
          "Manage your UserProxy trading account: open positions and settlement claims.",
      },
    ],
  }),
  component: PortfolioPage,
});

function PortfolioPage() {
  const { data: user } = useMe();
  const { data: markets = [] } = useMarkets();
  const { data: epochs } = useEpochs();
  const activeEpoch = epochs?.find((e: any) => e.status === "live" || e.status === "upcoming");
  const { data: pots = [] } = usePots(activeEpoch ? { epochId: activeEpoch.id } : undefined);

  const connected = !!user;
  const myPots = Array.isArray(pots) ? pots : [];
  const totalInvested = myPots.reduce((sum: number, p: any) => sum + (p.cash ?? 0) + (p.deployed ?? 0), 0);
  const totalNav = myPots.reduce((sum: number, p: any) => sum + (p.nav ?? 0), 0);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full min-h-[80vh] max-w-[1200px] flex-1 px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              UserProxy
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Portfolio</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Your on-chain trading account holds quote margin and per-market positions.
              Settlement claims unlock after oracle resolution.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/pots"
              className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-block-primary transition-all duration-150 hover:brightness-110 active:translate-y-[3px] active:shadow-none"
            >
              Epoch pots
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat
            icon={Wallet}
            label="Trading quote"
            value={<B3TR amount={totalInvested} iconSize={16} />}
            hint="Total deposited across pots"
          />
          <Stat
            icon={LayersIcon}
            label="In trader pots"
            value={<B3TR amount={totalNav} iconSize={16} />}
            hint={`${myPots.length} pot${myPots.length === 1 ? "" : "s"} joined`}
            accent
          />
          <Stat
            icon={ClipboardList}
            label="Open positions"
            value={`${myPots.filter((p: any) => p.status === "live").length} active`}
            hint="Pots currently trading"
          />
        </div>

        <section className="mt-10">
          <SectionHead
            icon={ClipboardList}
            title="Your pots"
            blurb="Pots you've joined or created this epoch."
          />
          {myPots.length === 0 ? (
            <Empty
              title="No pots yet"
              body={connected ? "Browse active pots and stake to join." : "Connect your wallet to view pots."}
              cta={{ label: "Browse pots", to: "/pots" }}
            />
          ) : (
            <div className="mt-3 space-y-2">
              {myPots.map((pot: any) => (
                <Link
                  key={pot.id}
                  to="/pots/$id"
                  params={{ id: pot.id }}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary/30"
                >
                  <div>
                    <p className="text-sm font-semibold">{pot.strategy?.title ?? "Untitled pot"}</p>
                    <p className="text-xs text-muted-foreground">
                      NAV <span className="font-medium text-foreground">${(pot.nav ?? 0).toFixed(2)}</span>
                      {" · "}LP <span className="font-medium text-foreground">{(pot.lpPrice ?? 1).toFixed(3)}</span>
                    </p>
                  </div>
                  <span className={cn(
                    "rounded-md px-2 py-0.5 text-xs font-semibold",
                    pot.status === "live" ? "bg-up/15 text-up" : pot.status === "funding" ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
                  )}>
                    {pot.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10 mb-4">
          <SectionHead
            icon={CircleDollarSign}
            title="Settlement claims"
            blurb="After oracle settlement, redeem expired proxy positions. Permissionless settle is available once the market is resolved."
          />
          <Empty
            title="Nothing to claim"
            body="Winning shares will show here when oracles resolve."
            cta={{ label: "How settlement works", to: "/epochs" }}
          />
        </section>
      </main>
      <Footer />
    </div>
  );
}

function LayersIcon(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 12.5-8.58 3.91a2 2 0 0 1-1.66 0L2.6 12.5" />
      <path d="m22 17.5-8.58 3.91a2 2 0 0 1-1.66 0L2.6 17.5" />
    </svg>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border p-4",
        accent && "border-primary/30 bg-primary/5",
      )}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 text-lg font-bold">{value}</div>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function SectionHead({
  icon: Icon,
  title,
  blurb,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  blurb: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{blurb}</p>
      </div>
    </div>
  );
}

function Empty({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { label: string; to: string };
}) {
  return (
    <div className="mt-3 rounded-xl border border-dashed border-border bg-secondary/20 px-4 py-8 text-center">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">{body}</p>
      {cta && (
        <Link
          to={cta.to}
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-link hover:underline"
        >
          {cta.label} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
