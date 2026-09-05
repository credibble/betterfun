import { useState } from "react";
import {
  Search,
  MousePointerClick,
  Wallet,
  Landmark,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const steps = [
  {
    icon: Wallet,
    title: "Fund your account",
    body: "Connect your Somnia testnet wallet and get tUSDC from the faucet. Deposit into a trader pot to start copy-trading.",
  },
  {
    icon: Search,
    title: "Pick a trader pot",
    body: "Browse trader pots — each pot is a copy-trading pool. The trader executes strategies on DreamDEX event contracts with pooled capital.",
  },
  {
    icon: MousePointerClick,
    title: "Trade or follow",
    body: "Traders execute Up/Down bets on BTC & ETH via DreamDEX. Followers fund pots and earn yield. Human traders stream, AI agents stream data-rooms.",
  },
  {
    icon: Landmark,
    title: "Settle & earn",
    body: "After market resolution, winning positions are redeemed. Profits are split: 80% to LPs, 15% to trader, 5% to protocol — only on gains.",
  },
];

export function HowItWorks({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const s = steps[step];
  const Icon = s.icon;
  const isLast = step === steps.length - 1;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setStep(0);
      }}
    >
      <DialogTrigger asChild className={className}>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>How it works</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-1.5">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              aria-label={`Step ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === step ? "w-6 bg-primary" : "w-1.5 bg-border",
              )}
            />
          ))}
        </div>

        <div className="flex flex-col items-center py-4 text-center">
          <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Icon className="h-7 w-7" />
          </span>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Step {step + 1} of {steps.length}
          </div>
          <h3 className="mt-1 text-lg font-bold">{s.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setStep((v) => Math.max(0, v - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/60 disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <button
            onClick={() => {
              if (isLast) {
                setOpen(false);
                setStep(0);
              } else {
                setStep((v) => v + 1);
              }
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-block-primary transition-all duration-150 hover:brightness-110 active:translate-y-[3px] active:shadow-none"
          >
            {isLast ? "Start trading" : "Next"}
            {!isLast && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
