import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Rocket,
  Video,
  Users,
  Wallet,
  ShieldCheck,
  TrendingUp,
  Radio,
  BarChart3,
  MessageSquare,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { B3TR } from "@/components/Token";

export const Route = createFileRoute("/become-a-trader/")({
  head: () => ({
    meta: [
      { title: "Become a Trader — Go Live & Get Copied | BetterFun" },
      {
        name: "description",
        content:
          "Turn your trading into income on BetterFun. Livestream your charts, build reputation, grow followers, and earn as people stake to copy your positions.",
      },
      { property: "og:title", content: "Become a Trader | BetterFun" },
      {
        property: "og:description",
        content:
          "Livestream your trades, build verified reputation, and earn from stakers who copy you.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: BecomeTraderPage,
});

const steps: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Users,
    title: "Create your profile",
    body: "Claim a handle, add your bio and strategy tags. Your verified PnL builds from day one.",
  },
  {
    icon: Video,
    title: "Go live from Studio",
    body: "Stream your live chart and talk through entries. Viewers watch and chat in real time.",
  },
  {
    icon: TrendingUp,
    title: "Build reputation",
    body: "Every settled trade updates your win rate and reputation score. Consistency wins followers.",
  },
  {
    icon: Wallet,
    title: "Earn from stakers",
    body: "People stake to copy your positions. You earn a share of the performance you generate.",
  },
];

const perks: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: BarChart3,
    title: "Verified track record",
    body: "PnL and win rate are tracked automatically — no screenshots, no cherry-picking.",
  },
  {
    icon: Radio,
    title: "Live streaming built in",
    body: "One-tap broadcasting with a synced live chart. No third-party software needed.",
  },
  {
    icon: MessageSquare,
    title: "Real-time community",
    body: "Chat with viewers as you trade and turn spectators into loyal stakers.",
  },
  {
    icon: ShieldCheck,
    title: "Transparent payouts",
    body: "Clear performance-based earnings. You see exactly what you earn and when.",
  },
];

function StatBox({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-center">
      <div className="num flex items-center justify-center text-2xl font-bold text-foreground">
        {value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function BecomeTraderPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="min-h-[80vh] flex-1">
        <section className="border-b border-border bg-gradient-to-b from-primary/[0.06] to-transparent">
          <div className="mx-auto w-full max-w-[1000px] px-4 py-14 text-center sm:py-20">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-primary">
              <Rocket className="h-3.5 w-3.5" /> Trader Program
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
              Turn your trading into a following
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
              Livestream your charts, build a verified reputation, and earn as traders stake to
              copy your positions on BetterFun.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/studio"
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-block-primary transition-all duration-150 hover:brightness-110 active:translate-y-[3px] active:shadow-none"
              >
                <Video className="h-4 w-4" /> Open Studio
              </Link>
              <Link
                to="/become-a-trader/settings"
                className="flex items-center gap-2 rounded-lg border border-border px-5 py-3 text-sm font-semibold text-foreground shadow-block-outline transition-all duration-150 hover:bg-secondary/60 active:translate-y-[3px] active:shadow-none"
              >
                <Settings className="h-4 w-4" /> Set up profile
              </Link>
              <Link
                to="/leaderboard"
                className="flex items-center gap-2 rounded-lg border border-border px-5 py-3 text-sm font-semibold text-foreground shadow-block-outline transition-all duration-150 hover:bg-secondary/60 active:translate-y-[3px] active:shadow-none"
              >
                See the leaderboard
              </Link>
            </div>

            <div className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-3">
              <StatBox value="180K+" label="Active stakers" />
              <StatBox value={<B3TR text="42M" iconSize={20} />} label="Copied volume" />
              <StatBox value="Up to 20%" label="Performance share" />
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1100px] px-4 py-14">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
            How it works
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted-foreground">
            From first stream to first payout in four steps.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="num text-2xl font-bold text-border">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {s.body}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="border-y border-border bg-nav/50">
          <div className="mx-auto w-full max-w-[1100px] px-4 py-14">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
              Everything you need to grow
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {perks.map((p) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.title}
                    className="flex gap-4 rounded-xl border border-border bg-card p-5"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold">{p.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {p.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
