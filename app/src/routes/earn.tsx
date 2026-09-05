import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Lock, Users } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PotCard } from "@/components/traders/PotCard";
import { useEpochs, useActiveEpoch, usePots } from "@/lib/queries";
import { cn } from "@/lib/utils";

function phaseLabel(phase: string): string {
  if (phase === "upcoming" || phase === "pre_start") return "Open to join";
  if (phase === "live") return "Live";
  if (phase === "settling" || phase === "post_end") return "Settling";
  if (phase === "settled") return "Settled";
  return phase;
}

export const Route = createFileRoute("/earn")({
  head: () => ({
    meta: [
      { title: "Earn — BetterFun" },
      {
        name: "description",
        content:
          "Back a trader for a round and share their result.",
      },
    ],
  }),
  component: EarnPage,
});

function EarnPage() {
  const { data: epochsData } = useEpochs();
  const { data: active } = useActiveEpoch();
  const epochs = Array.isArray(epochsData) ? epochsData : [];
  const nextStake = epochs.find((e) => e.status === "upcoming");
  const stakeEpochId = nextStake?.id ?? active?.id ?? "";
  const { data: potsData } = usePots(stakeEpochId ? { epochId: stakeEpochId } : undefined);
  const pots = Array.isArray(potsData) ? potsData : [];
  const epoch = epochs.find((e) => e.id === stakeEpochId);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full min-h-[80vh] max-w-[1200px] flex-1 px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Earn</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Back a trader for one round and share their result. Withdraw after it settles.
            </p>
          </div>
          <Link
            to="/epochs"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary/60"
          >
            Round calendar <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Back a trader</h2>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                  Join a pot before the round starts. During the live window the trader puts the pot
                  to work — you share the outcome. Withdraw after it settles.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {epoch ? `Epoch #${epoch.number}` : ""}
                </p>
              </div>
              {epoch && (
                <span
                  className={cn(
                    "rounded-md px-2 py-1 text-xs font-bold",
                    epoch.status === "upcoming" && "bg-primary/15 text-primary",
                    epoch.status === "live" && "bg-up/15 text-up",
                    epoch.status === "settling" && "bg-warn/20 text-warn",
                    epoch.status === "settled" && "bg-secondary text-muted-foreground",
                  )}
                >
                  {phaseLabel(epoch.status)}
                </span>
              )}
            </div>

            {epoch?.status === "live" && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2.5 text-xs text-foreground">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" />
                <p>
                  This round is live — new joins are locked. Check the{" "}
                  <Link to="/epochs" className="font-semibold text-link hover:underline">
                    round calendar
                  </Link>{" "}
                  for the next open window.
                </p>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pots.map((p) => (
              <PotCard key={p.id} pot={p} />
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Want the full list?{" "}
            <Link to="/pots" className="font-semibold text-link hover:underline">
              Browse all pots
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
