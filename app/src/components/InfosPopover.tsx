import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Info,
  Rocket,
  Trophy,
  BookOpen,
  ShieldCheck,
  FileText,
  Landmark,
  Briefcase,
  CalendarDays,
  Layers,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HowItWorks } from "@/components/HowItWorks";
import { cn } from "@/lib/utils";

type InfoLink = {
  icon: LucideIcon;
  tint: string;
  label: string;
  desc: string;
  to: string;
};

const groups: { title: string; links: InfoLink[] }[] = [
  {
    title: "Product",
    links: [
      {
        icon: Briefcase,
        tint: "text-primary bg-primary/15",
        label: "Portfolio",
        desc: "Positions, limits, claims",
        to: "/portfolio",
      },
      {
        icon: Landmark,
        tint: "text-up bg-up/15",
        label: "Earn",
        desc: "Vault & trader pots",
        to: "/earn",
      },
      {
        icon: CalendarDays,
        tint: "text-foreground bg-secondary",
        label: "Rounds",
        desc: "When pots open & settle",
        to: "/epochs",
      },
      {
        icon: Layers,
        tint: "text-up bg-up/15",
        label: "Trader pots",
        desc: "Back a trader for a round",
        to: "/pots",
      },
    ],
  },
  {
    title: "Get started",
    links: [
      {
        icon: Rocket,
        tint: "text-primary bg-primary/15",
        label: "Become a trader",
        desc: "Run an epoch pot",
        to: "/become-a-trader",
      },
      {
        icon: Trophy,
        tint: "text-up bg-up/15",
        label: "Leaderboard",
        desc: "Top performers this week",
        to: "/leaderboard",
      },
      {
        icon: Layers,
        tint: "text-foreground bg-secondary",
        label: "Trader Studio",
        desc: "Go live & manage pots",
        to: "/studio",
      },
    ],
  },
  {
    title: "Legal",
    links: [
      {
        icon: FileText,
        tint: "text-foreground bg-secondary",
        label: "Terms of Use",
        desc: "The rules of the platform",
        to: "/terms",
      },
      {
        icon: ShieldCheck,
        tint: "text-foreground bg-secondary",
        label: "Privacy Policy",
        desc: "How your data is handled",
        to: "/privacy",
      },
    ],
  },
];

/** Info / help menu popover with quick links to key pages. */
export function InfosPopover({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="Information"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground",
            className,
          )}
        >
          <Info className="h-[18px] w-[18px]" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[calc(100vw-1.5rem)] max-w-72 p-0">
        <div className="border-b border-border px-4 py-3">
          <div className="text-sm font-semibold text-foreground">Info & resources</div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Everything you need to get going.
          </p>
        </div>

        <div className="p-2">
          <HowItWorks className="w-full">
            <button
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-secondary/50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <BookOpen className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">How it works</span>
                <span className="block truncate text-xs text-muted-foreground">
                  A 60-second walkthrough
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </HowItWorks>
        </div>

        {groups.map((g) => (
          <div key={g.title} className="border-t border-border/60 p-2">
            <div className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
              {g.title}
            </div>
            {g.links.map((l) => {
              const Icon = l.icon;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-secondary/50"
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      l.tint,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">
                      {l.label}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {l.desc}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
