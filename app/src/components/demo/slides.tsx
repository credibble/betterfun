import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bot,
  Check,
  Clock,
  Coins,
  Cpu,
  Eye,
  KeyRound,
  Landmark,
  Layers,
  Lock,
  MessageCircle,
  Play,
  Radio,
  Rocket,
  Server,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Video,
  Wallet,
  X,
  Zap,
  Globe,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export type DemoSlide = {
  id: string;
  label: string;
  Component: React.ComponentType;
};

/* ------------------------------------------------------------------ */
/*  Shared illustration primitives                                     */
/* ------------------------------------------------------------------ */

function Window({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card shadow-elevated", className)}>
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-warn/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-up/70" />
        <span className="ml-2 flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
          <Zap className="h-3 w-3 fill-primary text-primary" /> betterfun
        </span>
        {title && <span className="ml-auto text-[10px] font-medium text-muted-foreground">{title}</span>}
      </div>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "up" | "down";
}) {
  return (
    <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "num text-sm font-bold",
          tone === "up" && "text-up",
          tone === "down" && "text-down",
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function PhasePill({
  label,
  tone,
  className,
}: {
  label: string;
  tone: "primary" | "up" | "warn" | "muted";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold",
        tone === "primary" && "bg-primary/15 text-primary",
        tone === "up" && "bg-up/15 text-up",
        tone === "warn" && "bg-warn/20 text-warn",
        tone === "muted" && "bg-secondary text-muted-foreground",
        className,
      )}
    >
      {label}
    </span>
  );
}

function Avatar({
  name,
  size = 36,
  live = false,
}: {
  name: string;
  size?: number;
  live?: boolean;
}) {
  return (
    <span
      className="relative inline-grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-accent font-bold text-primary-foreground"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {name.charAt(0).toUpperCase()}
      {live && (
        <span
          className="absolute rounded-full bg-red-500 ring-2 ring-card"
          style={{ width: size * 0.24, height: size * 0.24, right: 0, bottom: 0 }}
        />
      )}
    </span>
  );
}

function Tag({ children, tone = "muted" }: { children: React.ReactNode; tone?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold",
        tone === "primary" && "border-primary/30 bg-primary/10 text-primary",
        tone === "up" && "border-up/30 bg-up/10 text-up",
        tone === "down" && "border-down/30 bg-down/10 text-down",
        tone === "warn" && "border-warn/30 bg-warn/10 text-warn",
        tone === "muted" && "border-border bg-secondary/60 text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function SparkPath({ up = true, className }: { up?: boolean; className?: string }) {
  const d = up
    ? "M0 32 C 14 30, 20 24, 30 26 S 46 34, 58 22 S 76 12, 88 16 S 106 8, 120 4"
    : "M0 6 C 14 8, 20 16, 30 14 S 46 6, 58 18 S 76 28, 88 24 S 106 32, 120 36";
  return (
    <svg viewBox="0 0 120 40" preserveAspectRatio="none" className={className}>
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={`${d} L 120 40 L 0 40 Z`}
        fill="currentColor"
        opacity="0.08"
      />
    </svg>
  );
}

function FlowArrow({ className }: { className?: string }) {
  return (
    <ArrowRight className={cn("h-4 w-4 shrink-0 text-muted-foreground/50", className)} />
  );
}

/* ------------------------------------------------------------------ */
/*  01 · Cover                                                         */
/* ------------------------------------------------------------------ */

function CoverSlide() {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_1fr]">
      <div className="relative">
        <div
          className="pointer-events-none absolute -left-24 -top-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-accent/20 blur-3xl"
          aria-hidden
        />
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
          Somnia × DreamDEX · Hackathon
        </p>
        <h1 className="mt-3 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl">
          Follow creators.
          <br />
          Fund their pots.
          <br />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Share the upside.
          </span>
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          BetterFun is a creator-economy prediction market. Human traders and AI agents livestream,
          run <strong className="text-foreground">epoch pots</strong> their followers fund, and trade the
          pool on DreamDEX Event Contracts — without ever holding the money.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Tag tone="primary">tUSDC · 6 dp</Tag>
          <Tag tone="up">BTC / ETH Up · Down</Tag>
          <Tag tone="warn">Epoch-locked pots</Tag>
          <Tag tone="muted">Human + AI traders</Tag>
        </div>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            to="/pots"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-block-primary transition-all duration-150 hover:brightness-110 active:translate-y-[3px] active:shadow-none"
          >
            Explore live pots <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/epochs"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold hover:bg-secondary/60"
          >
            Epoch calendar
          </Link>
        </div>
      </div>

      <Window title="Featured pot" className="relative">
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-3">
            <Avatar name="Alyx" size={44} live />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">Alyx Voss · @alyx</p>
              <p className="text-[11px] text-muted-foreground">Momentum scalper — BTC/ETH binaries</p>
            </div>
            <PhasePill label="Live" tone="up" />
          </div>
          <div className="relative h-24 overflow-hidden rounded-lg border border-border bg-background/60">
            <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent" />
            <SparkPath up className="absolute inset-x-2 top-1 h-20 w-[calc(100%-1rem)] text-primary" />
            <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              <Eye className="h-3 w-3" /> 1,284
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="NAV" value="$128,420" />
            <Stat label="LP price" value="1.184" tone="up" sub="+18.4%" />
            <Stat label="Deployed" value="$86,240" />
          </div>
          <button className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground shadow-block-primary transition-all duration-150 hover:brightness-110 active:translate-y-[3px] active:shadow-none">
            Fund this pot
          </button>
        </div>
      </Window>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  02 · The Problem                                                   */
/* ------------------------------------------------------------------ */

function ProblemSlide() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        {[
          {
            icon: TrendingUp,
            title: "Skill is trapped",
            body: "Creators grow audiences trading, but their calls live in private chats — nobody can invest in the track record.",
          },
          {
            icon: Eye,
            title: "Attention pays $0",
            body: "Followers watch streams and chat all night, earning nothing while the trader takes all the risk and all the reward.",
          },
          {
            icon: Shield,
            title: "No trust layer",
            body: "Retail prediction trading is opaque and high-risk — no capital lock, no split of outcomes, no way to verify the trader.",
          },
        ].map((c) => (
          <div
            key={c.title}
            className="rounded-xl border border-border bg-card p-4 shadow-soft"
          >
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
              <c.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-sm font-bold">{c.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.body}</p>
          </div>
        ))}
      </div>

      <div className="grid items-stretch gap-3 md:grid-cols-2">
        <div className="flex items-center gap-4 rounded-xl border border-border bg-secondary/40 p-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground">
            <Video className="h-6 w-6" />
          </span>
          <div>
            <p className="text-sm font-bold text-muted-foreground">Watch a stream</p>
            <p className="text-xs text-muted-foreground">
              Viewers get entertainment. Earn <span className="font-bold text-down">$0</span>.
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">300 viewers · no upside</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-up/30 bg-up/5 p-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-up/15 text-up">
            <Coins className="h-6 w-6" />
          </span>
          <div>
            <p className="text-sm font-bold">Back a pot</p>
            <p className="text-xs text-muted-foreground">
              Fund an epoch pot. If it profits you share the gains — <span className="font-bold text-up">80%</span>.
            </p>
            <p className="mt-1 text-[11px] text-up">$500 → est. $592 (+18.4%)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  03 · The Product                                                   */
/* ------------------------------------------------------------------ */

function ProductSlide() {
  return (
    <div className="grid items-center gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="rounded-xl border border-border bg-card p-5 shadow-elevated">
        <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-muted-foreground">
          <span>Follow → Fund → Trade → Share</span>
          <PhasePill label="Epoch #12 · live" tone="up" />
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {[
              { n: "A", amt: "$250" },
              { n: "B", amt: "$500" },
              { n: "C", amt: "$1,000" },
            ].map((f) => (
              <div key={f.n} className="flex items-center gap-2">
                <Avatar name={f.n} size={30} />
                <span className="num text-xs font-bold text-up">{f.amt}</span>
              </div>
            ))}
            <span className="ml-auto text-[11px] text-muted-foreground">
              followers deposit <strong className="text-foreground">tUSDC</strong>
            </span>
          </div>

          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <ArrowDownRight className="h-4 w-4 rotate-45" />
            <span className="text-[11px] font-semibold">pooled 1:1 → shares minted</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <div>
                <p className="num text-[11px] font-bold">0x7F4a…e921</p>
                <p className="text-[10px] text-muted-foreground">per-pot signer · HD key</p>
              </div>
            </div>
            <FlowArrow />
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2">
              <BarChart3 className="h-4 w-4 text-up" />
              <div>
                <p className="num text-[11px] font-bold">$42,180 cash</p>
                <p className="text-[10px] text-muted-foreground">pot treasury · tUSDC</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
              <Bot className="h-4 w-4 text-primary" />
              <span className="text-[11px] font-bold">Trader / AI signals</span>
            </div>
            <FlowArrow />
            <div className="flex items-center gap-2 rounded-lg border border-up/30 bg-up/10 px-3 py-2">
              <TrendingUp className="h-4 w-4 text-up" />
              <span className="text-[11px] font-bold">DreamDEX Up/Down</span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[11px] font-semibold text-destructive">
            <X className="h-3.5 w-3.5 shrink-0" />
            The trader can <em>trade</em> the pot — but can never <em>withdraw</em> from it.
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {[
          {
            icon: Users,
            title: "Traders (human & AI)",
            body: "Create a profile, livestream, define a strategy and risk level, then run a pot each epoch.",
          },
          {
            icon: Wallet,
            title: "Followers (LP)",
            body: "Deposit tUSDC before the lock — 1:1 shares. Watch NAV live. Withdraw after settlement.",
          },
          {
            icon: Landmark,
            title: "Protocol",
            body: "Orchestrates epochs, executes orders, redeems winners, and settles the payout waterfall.",
          },
        ].map((c) => (
          <div key={c.title} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-soft">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
              <c.icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold">{c.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{c.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  04 · How It Works                                                  */
/* ------------------------------------------------------------------ */

const HOW_STEPS = [
  {
    icon: Wallet,
    title: "Fund",
    body: "Deposit tUSDC into a pot before the lock — 1:1 LP shares.",
  },
  {
    icon: Lock,
    title: "Lock",
    body: "Epoch goes live. Deposits close, the pot is locked in.",
  },
  {
    icon: TrendingUp,
    title: "Trade",
    body: "Trader / AI places IOC & limit orders on DreamDEX with the pot signer.",
  },
  {
    icon: Landmark,
    title: "Settle",
    body: "Markets resolve → NAV is computed on-chain → payout waterfall.",
  },
  {
    icon: Coins,
    title: "Claim",
    body: "Followers claim their pro-rata share straight to their wallet.",
  },
];

function HowItWorksSlide() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {HOW_STEPS.map((s, i) => (
          <div key={s.title} className="relative flex flex-col rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
                <s.icon className="h-5 w-5" />
              </span>
              <span className="num text-lg font-black text-muted-foreground/30">{i + 1}</span>
            </div>
            <h3 className="mt-3 text-sm font-bold">{s.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
            {i < HOW_STEPS.length - 1 && (
              <FlowArrow className="absolute -right-3 top-1/2 hidden -translate-y-1/2 lg:block" />
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-secondary/30 p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> A single epoch, end to end
        </p>
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-5">
          {[
            ["Mon 09:00", "Funding opens", "primary"],
            ["Mon 12:00", "Lock · go live", "up"],
            ["Tue 11:30", "Trading closes (buffer)", "warn"],
            ["Tue 12:00", "Settle & distribute", "up"],
            ["Tue 12:05", "Followers claim", "muted"],
          ].map(([t, l, tone]) => (
            <div
              key={t}
              className="rounded-lg border border-border bg-card px-3 py-2"
            >
              <p className="num text-[11px] font-bold">{t}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{l}</p>
              <PhasePill label={l.split(" ")[0]} tone={tone as "primary" | "up" | "warn" | "muted"} className="mt-1.5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  05 · Epoch state machine                                           */
/* ------------------------------------------------------------------ */

const PHASES = [
  {
    label: "Upcoming",
    tone: "primary" as const,
    icon: Wallet,
    body: "Funding window — deposit / withdraw at lpPrice 1.0. Traders create pots.",
  },
  {
    label: "Live",
    tone: "up" as const,
    icon: TrendingUp,
    body: "Pots locked. Trader or AI places orders on the event contracts.",
  },
  {
    label: "Settling",
    tone: "warn" as const,
    icon: Clock,
    body: "Trading closed with a buffer. Wait for every market to resolve, then NAV.",
  },
  {
    label: "Settled",
    tone: "muted" as const,
    icon: Coins,
    body: "Payout waterfall finalised. Followers claim their share.",
  },
];

function EpochMachineSlide() {
  return (
    <div className="space-y-6">
      <div className="grid gap-2 md:grid-cols-4">
        {PHASES.map((p, i) => (
          <div key={p.label} className="relative rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <PhasePill label={p.label} tone={p.tone} />
              <p.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">{p.body}</p>
            {i < PHASES.length - 1 && (
              <FlowArrow className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 md:block" />
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          <BarChart3 className="h-3.5 w-3.5" /> The epoch timeline — BullMQ driven
        </p>
        <div className="mt-4">
          <div className="relative h-3 rounded-full bg-secondary">
            <div className="absolute inset-y-0 left-0 w-[22%] rounded-full bg-primary/80" />
            <div className="absolute inset-y-0 left-[22%] w-[38%] rounded-full bg-up/80" />
            <div className="absolute inset-y-0 left-[60%] w-[18%] rounded-full bg-warn/80" />
            <div className="absolute inset-y-0 left-[78%] w-[22%] rounded-full bg-secondary" />
            <span className="absolute left-[22%] top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-foreground" />
            <span className="absolute left-[60%] top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-foreground" />
            <span className="absolute left-[78%] top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-foreground" />
          </div>
          <div className="mt-2 grid grid-cols-4 text-[11px] text-muted-foreground">
            <span>t_start</span>
            <span className="text-up">t_end − buffer</span>
            <span className="text-warn">resolution window</span>
            <span className="text-right">hard end</span>
          </div>
        </div>
        <p className="mt-4 flex items-start gap-2 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-foreground">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" />
          <span>
            A <strong>settlement buffer</strong> (30–60 min) keeps trading inside the epoch and lets every
            DreamDEX market reach <em>Resolved</em> before NAV is computed. When an epoch settles, the next
            one rolls over automatically.
          </span>
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  06 · The Pot                                                       */
/* ------------------------------------------------------------------ */

function PotSlide() {
  const positions = [
    { sym: "BTC · 30m", side: "Up", contracts: "12,400", price: "0.58", pnl: "+$3,140" },
    { sym: "ETH · 5m", side: "Down", contracts: "8,000", price: "0.62", pnl: "+$1,920" },
    { sym: "BTC · 1h", side: "Up", contracts: "6,300", price: "0.55", pnl: "−$380" },
  ];
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.35fr_1fr]">
      <Window title="Pot · Alyx" className="overflow-hidden">
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Avatar name="Alyx" size={44} live />
            <div className="min-w-0">
              <p className="text-sm font-bold">Alyx Voss · @alyx</p>
              <p className="text-[11px] text-muted-foreground">Momentum scalper · risk: balanced</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <PhasePill label="Epoch #12" tone="primary" />
              <PhasePill label="Live" tone="up" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat label="NAV" value="$128,420" sub="tUSDC on-chain" />
            <Stat label="Cash" value="$42,180" sub="available to deploy" />
            <Stat label="Deployed" value="$86,240" sub="open contracts" />
            <Stat label="LP price" value="1.184" tone="up" sub="+18.4% vs 1.0" />
            <Stat label="Shares" value="108,500" sub="outstanding" />
            <Stat label="Signer" value="…e921" sub="per-pot HD key" />
          </div>

          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Open positions
            </p>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/50 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-1.5">Market</th>
                    <th className="px-3 py-1.5">Side</th>
                    <th className="px-3 py-1.5 text-right">Contracts</th>
                    <th className="px-3 py-1.5 text-right">Avg</th>
                    <th className="px-3 py-1.5 text-right">PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p) => (
                    <tr key={p.sym} className="border-b border-border last:border-0">
                      <td className="px-3 py-1.5 font-semibold">{p.sym}</td>
                      <td className="px-3 py-1.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold",
                            p.side === "Up" ? "bg-up/15 text-up" : "bg-down/15 text-down",
                          )}
                        >
                          {p.side === "Up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {p.side}
                        </span>
                      </td>
                      <td className="num px-3 py-1.5 text-right">{p.contracts}</td>
                      <td className="num px-3 py-1.5 text-right">{p.price}</td>
                      <td className={cn("num px-3 py-1.5 text-right font-bold", p.pnl.startsWith("+") ? "text-up" : "text-down")}>
                        {p.pnl}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Window>

      <div className="space-y-3">
        {[
          {
            icon: Coins,
            title: "Shares = LP ownership",
            body: "Every tUSDC deposited before the lock mints 1:1 shares. NAV per share (lpPrice) streams live over the socket.",
          },
          {
            icon: KeyRound,
            title: "The pot is a real wallet",
            body: "Each pot gets a dedicated on-chain signer (HD-derived). All cash is tUSDC that really sits on-chain — no IOU.",
          },
          {
            icon: Bot,
            title: "Trader signals · backend executes",
            body: "The trader (or AI) picks side, market, size and a max price. The backend trades the pot's key with strict authority separation.",
          },
          {
            icon: Radio,
            title: "Real-time NAV",
            body: "Fills, positions and NAV push to followers via the WebSocket hub — you watch the pot live, trade by trade.",
          },
        ].map((c) => (
          <div key={c.title} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-soft">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
              <c.icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold">{c.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{c.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  07 · Non-custodial delegated trading                               */
/* ------------------------------------------------------------------ */

function CustodySlide() {
  return (
    <div className="space-y-6">
      <div className="grid items-stretch gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-up/30 bg-up/5 p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-up">
            <ShieldCheck className="h-4 w-4" /> Pot signer CAN
          </p>
          <ul className="mt-3 space-y-2 text-xs text-foreground">
            {[
              ["Place & cancel orders", "IOC / POST_ONLY on event contracts"],
              ["Mint / burn complete sets", "for SELL_* — never shorts"],
              ["Redeem winning positions", "after the oracle resolves"],
              ["Hold all tUSDC", "the pool is a real on-chain balance"],
            ].map(([t, s]) => (
              <li key={t} className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-up" />
                <span>
                  <strong>{t}</strong>
                  <span className="text-muted-foreground"> — {s}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-destructive">
            <X className="h-4 w-4" /> Pot signer CANNOT
          </p>
          <ul className="mt-3 space-y-2 text-xs text-foreground">
            {[
              ["Transfer tUSDC to the trader", "their wallet is never a payout target"],
              ["Pay out except pro-rata", "only the settlement flow moves funds"],
              ["Withdraw before settlement", "epochs lock funding at go-live"],
              ["Short the market", "SELL_* must be covered by a minted set"],
            ].map(([t, s]) => (
              <li key={t} className="flex items-start gap-2">
                <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                <span>
                  <strong>{t}</strong>
                  <span className="text-muted-foreground"> — {s}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <div className="grid items-center gap-4 md:grid-cols-[auto_1fr_auto]">
          <div className="rounded-lg border border-border bg-background/60 px-4 py-3 text-center">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Master seed</p>
            <p className="num mt-1 font-mono text-xs font-bold">0x••••••••</p>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <ArrowRight className="h-4 w-4 shrink-0" />
            <span className="num font-mono text-[11px]">m/44'/60'/0'/0/{'{potIndex}'}</span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-center">
            <p className="text-[10px] uppercase tracking-wide text-primary">Per-pot signer</p>
            <p className="num mt-1 font-mono text-xs font-bold">0x7F4a…e921</p>
          </div>
        </div>
        <p className="mt-4 flex items-start gap-2 rounded-lg border border-up/30 bg-up/5 px-3 py-2 text-xs text-foreground">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-up" />
          <span>
            <strong>Non-custodial-with-custody.</strong> Funds live in tUSDC controlled by a per-pot signer key held
            only by the backend. Trading authority is separate from payout authority: only{" "}
            <span className="font-mono text-[11px]">SettlementService.claimPayout</span> can move money off the pot,
            and it goes pro-rata to followers only.
          </span>
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  08 · The payout waterfall                                          */
/* ------------------------------------------------------------------ */

function WaterfallSlide() {
  const principal = 100;
  const lp = 14.72;
  const trader = 2.76;
  const proto = 0.92;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold">Profit scenario — $100,000 pot → $118,400 NAV</p>
            <Tag tone="up">+18.4%</Tag>
          </div>
          <div className="mt-4 flex h-9 w-full overflow-hidden rounded-lg border border-border">
            <div
              className="flex items-center justify-center bg-secondary text-[10px] font-bold text-muted-foreground"
              style={{ width: `${principal}%` }}
            >
              principal
            </div>
            <div
              className="flex items-center justify-center bg-up text-[10px] font-bold text-white"
              style={{ width: `${lp}%` }}
            >
              LP
            </div>
            <div
              className="flex items-center justify-center bg-primary text-[10px] font-bold text-white"
              style={{ width: `${trader}%` }}
            >
              trader
            </div>
            <div
              className="flex items-center justify-center bg-link text-[10px] font-bold text-white"
              style={{ width: `${proto}%` }}
            >
              proto
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              ["$14,720", "LPs — 80% of gains", "up"],
              ["$2,760", "Trader — 15% of gains", "primary"],
              ["$920", "Protocol — 5% of gains", "link"],
              ["$100,000", "Principal returned 1:1", "muted"],
            ].map(([v, l, tone]) => (
              <div key={l} className="flex items-center justify-between rounded-lg border border-border bg-background/60 px-3 py-2">
                <span className="text-[11px] text-muted-foreground">{l}</span>
                <span
                  className={cn(
                    "num text-sm font-bold",
                    tone === "up" && "text-up",
                    tone === "primary" && "text-primary",
                    tone === "link" && "text-link",
                    tone === "muted" && "text-muted-foreground",
                  )}
                >
                  {v}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Cuts are taken <strong className="text-foreground">only on gains</strong> — everyone is paid out of profit,
            so incentives are aligned.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex-1 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">Loss scenario</p>
              <Tag tone="down">−9.0%</Tag>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Pot ends at <strong className="text-foreground">$91,000</strong>. The trader and the protocol get{" "}
              <strong className="text-down">$0</strong> — followers split what's left{" "}
              <strong className="text-foreground">pro-rata by shares</strong>.
            </p>
            <div className="mt-3 flex h-7 w-full overflow-hidden rounded-lg border border-border bg-secondary">
              <div className="flex w-full items-center justify-center text-[10px] font-bold text-muted-foreground">
                $91,000 → followers
              </div>
            </div>
          </div>
          <div className="flex-1 rounded-xl border border-border bg-card p-4 shadow-soft">
            <p className="flex items-center gap-1.5 text-sm font-bold">
              <BarChart3 className="h-4 w-4 text-primary" /> The formula
            </p>
            <p className="num mt-3 rounded-lg border border-border bg-background/60 px-3 py-2 font-mono text-xs">
              perShare = finalNav ÷ totalShares
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              NAV is read from the pot signer's on-chain tUSDC balance <em>after</em> all redemptions — the real
              number, never an estimate. Dust is left in the pot (never fractional cents).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  09 · The AI agent                                                  */
/* ------------------------------------------------------------------ */

function AiSlide() {
  const json = [
    "{",
    '  "action": "buy_up",',
    '  "marketId": "0x9f2…7c",',
    '  "symbol": "BTC/30m",',
    '  "sizeUsd": 4200,',
    '  "maxPrice": 0.62,',
    '  "confidence": 0.81,',
    '  "rationale": "breakout above range, volume expanding, time-to-expiry 22m"',
    "}",
  ];
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-elevated">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-bold">
              <Bot className="h-4 w-4 text-primary" /> AI decision — validated JSON
            </p>
            <Tag tone="up">confidence 0.81 ≥ 0.7 ✓</Tag>
          </div>
          <pre className="num mt-3 overflow-x-auto rounded-lg border border-border bg-background/80 p-3 font-mono text-[11px] leading-relaxed">
            {json.map((l) => (
              <div key={l} className="whitespace-pre">
                {l.includes('"sizeUsd"') || l.includes('"confidence"') ? (
                  <>
                    <span className="text-primary">{l.slice(0, l.indexOf(":") + 1)}</span>
                    <span className="text-up">{l.slice(l.indexOf(":") + 1)}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">{l}</span>
                )}
              </div>
            ))}
          </pre>
          <p className="mt-3 flex items-start gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            The model gets live spot, order books, time-to-expiry, and the pot's cash/deployed — then must return a
            schema-valid decision or <span className="font-mono">hold</span>.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
          <p className="text-sm font-bold">Risk controls — enforced server-side</p>
          <ul className="mt-2 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
            {[
              "size ≤ risk % of cash",
              "confidence ≥ threshold",
              "maxPrice = sane limit, never chase",
              "cancel if not filled in window",
              "per-epoch loss budget cap",
              "gate on on-chain status Trading",
            ].map((c) => (
              <li key={c} className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 shrink-0 text-up" /> {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <p className="text-sm font-bold">Max single-trade size, per risk level</p>
          <div className="mt-4 space-y-3">
            {[
              { lvl: "Conservative", pct: "≤ 5%", w: 15, tone: "bg-up" },
              { lvl: "Balanced", pct: "≤ 10%", w: 30, tone: "bg-primary" },
              { lvl: "Aggressive", pct: "≤ 20%", w: 58, tone: "bg-destructive" },
            ].map((g) => (
              <div key={g.lvl}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold">{g.lvl}</span>
                  <span className="num font-bold">{g.pct} of cash</span>
                </div>
                <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div className={cn("h-full rounded-full", g.tone)} style={{ width: `${g.w}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 rounded-xl border border-border bg-card p-5 shadow-soft">
          <p className="text-sm font-bold">Execution discipline</p>
          <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
            {[
              ["Price-capped IOC", "taker only when the touch beats maxPrice — effectively a limit-to-touch"],
              ["POST_ONLY for resting quotes", "maker orders that must not cross"],
              ["Quantized to tick/lot grid", "dodges the 18-decimal float bug on the venue"],
              ["One exchange + lock per pot", "serialised nonces — never two bots on one key"],
            ].map(([t, s]) => (
              <li key={t} className="flex items-start gap-2">
                <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>
                  <strong className="text-foreground">{t}</strong> — {s}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  10 · Live streaming & community                                    */
/* ------------------------------------------------------------------ */

function LiveSlide() {
  const msgs = [
    ["dev_runner", "funded 250 usdc in the pot 🔥"],
    ["alpha_seeker", "why down on ETH here?"],
    ["alyx", "breakout retest — tight stops"],
    ["chain_girl", "nav looks great, gl team"],
  ];
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Window title="Alyx · live now" className="overflow-hidden">
        <div className="relative aspect-video bg-gradient-to-br from-purple-900/60 via-background to-blue-900/60">
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE
          </div>
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
            <Eye className="h-3 w-3" /> 1,284
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Avatar name="Alyx" size={64} live />
            <p className="text-sm font-bold text-white drop-shadow">Alyx — BTC/ETH momentum scalping</p>
            <button className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-foreground shadow-lg">
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            </button>
          </div>
          <div className="absolute bottom-3 left-3 right-3">
            <div className="glass-card rounded-lg p-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-foreground">Live NAV</span>
                <span className="num font-bold text-up">+18.4%</span>
              </div>
              <SparkPath up className="mt-1 h-8 w-full text-up" />
            </div>
          </div>
        </div>
      </Window>

      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
          <p className="flex items-center gap-1.5 text-sm font-bold">
            <MessageCircle className="h-4 w-4 text-primary" /> Live chat
          </p>
          <div className="mt-3 space-y-2">
            {msgs.map(([who, text]) => (
              <div key={text} className="flex items-start gap-2 rounded-lg border border-border bg-background/60 px-3 py-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                  {who.charAt(0).toUpperCase()}
                </span>
                <p className="text-xs leading-snug">
                  <span className="font-bold">{who}</span>{" "}
                  <span className="text-muted-foreground">{text}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 rounded-xl border border-border bg-card p-4 shadow-soft">
          <p className="text-sm font-bold">Built for the creator economy</p>
          <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
            {[
              ["Human traders", "stream their real process on LiveKit — transparency you can audit"],
              ["AI agents", "stream data-rooms: books, signals and rationale, not hype"],
              ["Realtime everywhere", "positions, fills, NAV and chat push over the WS hub"],
            ].map(([t, s]) => (
              <li key={t} className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-up" />
                <span>
                  <strong className="text-foreground">{t}</strong> — {s}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  11 · The stack                                                     */
/* ------------------------------------------------------------------ */

function StackSlide() {
  const layers = [
    {
      icon: Globe,
      name: "Frontend app",
      tone: "primary" as const,
      chips: ["Vite + React 19", "TanStack Router/Query", "wagmi / viem", "Reown (WalletConnect)"],
      body: "Discover, fund, stream and studio — every backend route typed via shared Zod DTOs.",
    },
    {
      icon: Server,
      name: "Backend",
      tone: "up" as const,
      chips: ["Express + TypeScript", "TypeORM + Postgres", "BullMQ + Redis", "JWT · SIWE auth", "LiveKit · OpenAI · WS hub"],
      body: "Epoch/pot state machine, delegated trading engine, settlement, AI agent, realtime push.",
    },
    {
      icon: Layers,
      name: "shared",
      tone: "warn" as const,
      chips: ["Zod schemas"],
      body: "Single source of truth for DTOs, enums and types across app + backend.",
    },
    {
      icon: Cpu,
      name: "DreamDEX",
      tone: "muted" as const,
      chips: ["@somnia-chain/markets-sdk", "Event Contracts", "tUSDC (6 dp) · STT gas"],
      body: "Up/Down binary markets, per-pot signers, on-chain reads/writes and live watches.",
    },
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {layers.map((l, i) => (
          <div key={l.name} className="relative rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary">
                <l.icon className="h-4 w-4" />
              </span>
              <span className="num text-sm font-black text-muted-foreground/30">0{i + 1}</span>
            </div>
            <p className="mt-3 text-sm font-bold">{l.name}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{l.body}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {l.chips.map((c) => (
                <Tag key={c} tone={l.tone}>
                  {c}
                </Tag>
              ))}
            </div>
            {i < layers.length - 1 && (
              <ArrowRight className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-muted-foreground/40 xl:block" />
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <p className="flex items-start gap-2 text-xs leading-relaxed text-foreground">
          <Rocket className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>
            <strong>No smart contracts were deployed.</strong> Non-custodial delegated trading is achieved with
            per-pot HD-derived signer keys held server-side plus strict software-level authority separation —
            trading and payout are different paths with different rules.
          </span>
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  12 · Roadmap & CTA                                                 */
/* ------------------------------------------------------------------ */

function RoadmapSlide() {
  const roadmap = [
    { phase: "Now", tone: "up" as const, items: ["Epoch-locked pots with 1:1 shares", "Human + AI traders", "Per-pot HD signers · non-custodial", "Settlement waterfall + claims"] },
    { phase: "Next", tone: "primary" as const, items: ["On-chain vault (ERC-6909 / Safe)", "Restricted canCall / cannotCall roles", "Delegated trading transparency feed"] },
    { phase: "Later", tone: "muted" as const, items: ["Multi-trader pot marketplace", "Operator / session-key models", "Mainnet — USDso (18 dp)"] },
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        {roadmap.map((r, i) => (
          <div key={r.phase} className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">{r.phase}</p>
              <PhasePill label={r.phase} tone={r.tone} />
            </div>
            <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
              {r.items.map((it) => (
                <li key={it} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-up" /> {it}
                </li>
              ))}
            </ul>
            {i < roadmap.length - 1 && (
              <FlowArrow className="absolute" />
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 to-accent/10 p-6 text-center">
        <p className="text-sm font-bold">See it in action</p>
        <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
          Fund a pot before the lock, watch the trader put it to work live, then claim your share when the epoch
          settles — all on Somnia testnet.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link to="/pots" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-block-primary transition-all duration-150 hover:brightness-110 active:translate-y-[3px] active:shadow-none">
            Explore pots <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/epochs" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary/60">
            Epoch calendar
          </Link>
          <Link to="/traders" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary/60">
            Top traders
          </Link>
          <Link to="/studio" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary/60">
            Studio
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Deck registry                                                      */
/* ------------------------------------------------------------------ */

export const DEMO_SLIDES: DemoSlide[] = [
  { id: "cover", label: "Cover", Component: CoverSlide },
  { id: "problem", label: "Problem", Component: ProblemSlide },
  { id: "product", label: "Product", Component: ProductSlide },
  { id: "how", label: "How it works", Component: HowItWorksSlide },
  { id: "epochs", label: "Epochs", Component: EpochMachineSlide },
  { id: "pot", label: "The pot", Component: PotSlide },
  { id: "custody", label: "Custody", Component: CustodySlide },
  { id: "waterfall", label: "Waterfall", Component: WaterfallSlide },
  { id: "ai", label: "AI agent", Component: AiSlide },
  { id: "live", label: "Live & chat", Component: LiveSlide },
  { id: "stack", label: "Stack", Component: StackSlide },
  { id: "roadmap", label: "Roadmap", Component: RoadmapSlide },
];