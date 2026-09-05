import { ArrowRight, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function EarnBanner() {
  return (
    <Link
      to="/earn"
      className="group mx-auto flex w-full max-w-[800px] items-center gap-3 overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-r from-primary/12 via-primary/5 to-transparent px-4 py-3 transition-colors duration-200 hover:border-primary/40"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary ring-1 ring-inset ring-primary/25">
        <Users className="h-4 w-4" />
      </span>

      <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 text-sm text-foreground">
        <span className="font-semibold">Back a trader</span>
        <span className="text-muted-foreground">for an epoch and</span>
        <span className="font-semibold">share their results</span>
      </p>

      <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-transform duration-150 group-hover:brightness-110">
        Earn
        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
