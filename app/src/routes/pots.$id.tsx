import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CalendarDays, Lock, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { StakePanel } from "@/components/traders/StakePanel";
import { StrategyInfoNote } from "@/components/traders/StrategyInfoNote";
import { EpochPhaseBadge } from "@/components/traders/EpochPhaseBadge";
import { TraderAvatar } from "@/components/traders/TraderAvatar";
import { usePot, useTrader, useEpoch, usePayout, usePotShares, useMe } from "@/lib/queries";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/clipboard";

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

function phaseHint(status: string): string {
  if (status === "upcoming" || status === "funding") return "Funding open — you can join or leave freely before the epoch locks.";
  if (status === "live") return "The trader is working the pot. Stakes are locked until settlement.";
  if (status === "settling") return "Trading is done. Settlement is pending.";
  if (status === "settled") return "The pot has settled. Claim your share.";
  return "";
}

export const Route = createFileRoute("/pots/$id")({
  head: () => ({
    meta: [
      { title: "Pot — BetterFun" },
      { name: "description", content: "Trader pot on BetterFun." },
    ],
  }),
  component: PotDetailPage,
});

function PotDetailPage() {
  const { id } = Route.useParams();
  const { data: pot, isLoading, error } = usePot(id);
  const { data: epoch } = useEpoch(pot?.epochId ?? "");
  const { data: trader } = useTrader(pot?.traderId ?? "");
  const { data: payout } = usePayout(pot?.id ?? "");
  const { data: shares } = usePotShares(pot?.id ?? "");
  const { data: me } = useMe();

  const [copied, setCopied] = useState(false);
  const name = trader?.name ?? "Trader";
  const hue = seedHue(pot?.traderId || pot?.id || "");

  const myShare = shares?.find((s) => me?.id && s.userId === me.id);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Navbar />
        <div className="mx-auto flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading pot...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !pot) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Navbar />
        <div className="mx-auto flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <h1 className="text-xl font-semibold">Pot not found</h1>
          <Link to="/pots" className="text-link hover:underline">
            Back to pots
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const copySigner = () => {
    if (!pot?.signerAddress) return;
    copyToClipboard(pot.signerAddress).then((ok) => {
      setCopied(ok);
      if (!ok) toast.error("Could not copy — select the text and press Ctrl+C");
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full min-h-[80vh] max-w-[1200px] flex-1 px-4 py-6">
        <Link
          to="/pots"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to pots
        </Link>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0 space-y-5">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <TraderAvatar
                    name={name}
                    hue={hue}
                    size={56}
                    live={trader?.isLive}
                  />
                  <div>
                    <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{name}</h1>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span>{epoch ? `Epoch #${epoch.number}` : "Epoch pot"}</span>
                      <EpochPhaseBadge phase={epoch?.status as any} />
                      <span className="rounded-md bg-secondary/60 px-2 py-0.5 text-xs font-semibold text-foreground">
                        {pot.status}
                      </span>
                    </div>
                  </div>
                </div>
                {trader && (
                  <Link
                    to="/traders/$id"
                    params={{ id: trader.id }}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-link hover:underline"
                  >
                    Trader profile <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Metric label="In the pot" value={formatUsd(pot.nav)} />
                <Metric
                  label="LP price"
                  value={`$${Number(pot.lpPrice).toFixed(3)}`}
                />
                <Metric
                  label="At work"
                  value={
                    pot.nav > 0 ? `${Math.round((pot.deployed / pot.nav) * 100)}%` : "—"
                  }
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
                <span>Pot signer (on-chain funds)</span>
                <button
                  type="button"
                  onClick={copySigner}
                  className="inline-flex items-center gap-1 font-semibold text-link hover:underline"
                >
                  {pot.signerAddress}
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>

            <StrategyInfoNote strategy={pot.strategy} />

            {epoch && (
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">This epoch</h2>
                  <EpochPhaseBadge phase={epoch.status as any} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{phaseHint(epoch.status)}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(epoch.startsAt).toLocaleDateString()} →{" "}
                  {new Date(epoch.endsAt).toLocaleDateString()}
                </p>
                <ol className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <li>
                    <span className="font-medium text-foreground">Funding</span> — join or
                    leave freely
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Live</span> — trader works the
                    pot; stakes stay put
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Settled</span> — claim your
                    share
                  </li>
                </ol>
                {pot.status === "live" && (
                  <div className="mt-4 flex items-start gap-2 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2.5 text-xs">
                    <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" />
                    <p>
                      This pot is mid-round — new joins are locked until it settles. Browse{" "}
                      <Link to="/pots" className="font-semibold text-link hover:underline">
                        upcoming pots
                      </Link>{" "}
                      to join before the next window.
                    </p>
                  </div>
                )}
              </div>
            )}

            {pot.status === "settled" && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold">Settlement</h2>
                {payout ? (
                  <div className="mt-3 space-y-2">
                    <SettlementRow label="Per-share value" value={`$${Number(payout.perShare).toFixed(4)}`} bold />
                    <SettlementRow label="Trader cut (gains only)" value={formatUsd(payout.traderCutUsd)} />
                    <SettlementRow label="Protocol cut" value={formatUsd(payout.protocolCutUsd)} />
                    <SettlementRow label="Distributed to LPs" value={formatUsd(payout.lpDistributedUsd)} />
                    {myShare && (
                      <SettlementRow label="Your claimable share" value={formatUsd(myShare.claimableUsd)} accent />
                    )}
                    <p className="pt-1 text-xs text-muted-foreground">
                      Claim from the sidebar. On a loss the trader takes nothing and LPs split
                      what&apos;s left pro-rata.
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Settlement is being computed — market resolution pending.
                  </p>
                )}
              </div>
            )}

            <div className="rounded-xl border border-border p-5">
              <h2 className="text-sm font-semibold">What you should know</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>
                  On profit, fees split roughly{" "}
                  <span className="text-foreground">15% trader / 5% protocol / 80% you</span>.
                  Losses hit pot holders only.
                </li>
                <li>
                  Pots trade without borrowed leverage — plain stake, shared result.
                </li>
                <li>
                  Deposits are verified on chain before shares are minted.
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <StakePanel trader={trader ?? { id: pot.traderId, name }} pot={pot} preferredEpochId={pot.epochId} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg bg-secondary/40 px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={accent ? "mt-0.5 text-sm font-bold text-up" : "mt-0.5 text-sm font-bold"}>
        {value}
      </p>
    </div>
  );
}

function SettlementRow({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cnValue(bold, accent)}>{value}</span>
    </div>
  );
}

function cnValue(bold?: boolean, accent?: boolean): string {
  const cls = ["num"];
  if (accent) cls.push("font-bold text-up");
  else if (bold) cls.push("font-bold text-foreground");
  else cls.push("text-foreground");
  return cls.join(" ");
}