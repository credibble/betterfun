import { useState, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Search,
  Sparkles,
  TrendingUp,
  Users,
  Layers,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { usePots, useTraders } from "@/lib/queries";

const browse: { label: string; icon: typeof Search; to: string }[] = [
  { label: "Pots", icon: Layers, to: "/pots" },
  { label: "Trending", icon: TrendingUp, to: "/" },
];

const topics: { label: string; icon: typeof Search; to: string; tint: string }[] = [
  { label: "Traders", icon: Users, to: "/traders", tint: "text-rose-500" },
  { label: "Epochs", icon: Sparkles, to: "/epochs", tint: "text-violet-500" },
];

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export function SearchPopover({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { data: pots = [] } = usePots();
  const { data: traders = [] } = useTraders();

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const query = q.toLowerCase();
    const potHits = (Array.isArray(pots) ? pots : [])
      .filter((p) => p.id.toLowerCase().includes(query) || p.strategy?.title?.toLowerCase().includes(query))
      .slice(0, 4)
      .map((p) => ({ kind: "pot" as const, id: p.id, label: `Pot · ${p.strategy?.title ?? p.id}`, nav: "/pots/$id" as const, navId: p.id }));
    const traderHits = (Array.isArray(traders) ? traders : [])
      .filter((t) => t.name.toLowerCase().includes(query) || t.handle.toLowerCase().includes(query))
      .slice(0, 4)
      .map((t) => ({ kind: "trader" as const, id: t.id, label: `Trader · ${t.name}`, nav: "/traders/$id" as const, navId: t.id }));
    return [...potHits, ...traderHits].slice(0, 6);
  }, [pots, traders, q]);

  const go = (r: { nav: "/pots/$id"; navId: string } | { nav: "/traders/$id"; navId: string }) => {
    setOpen(false);
    navigate({ to: r.nav, params: { id: r.navId } });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full min-w-0 items-center gap-2 rounded-lg border border-border bg-secondary/60 px-2.5 py-2 text-left transition-colors hover:border-primary/40 sm:px-3",
            className,
          )}
        >
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
            {q || "Search pots & traders..."}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[min(560px,calc(100vw-2rem))] rounded-xl border-border bg-card p-0 shadow-xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (results[0]) go(results[0]);
            else navigate({ to: "/" });
          }}
          className="flex items-center gap-2 border-b border-border px-4 py-3"
        >
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search pots & traders..."
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </form>

        {q.trim() && (
          <div className="border-b border-border p-3">
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Results
            </div>
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pots or traders found</p>
            ) : (
              <div className="space-y-1">
                {results.map((hit) => (
                  <button
                    key={`${hit.kind}-${hit.id}`}
                    type="button"
                    onClick={() => go(hit)}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-secondary/60"
                  >
                    <span className="truncate font-medium">{hit.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Browse
          </div>
          <div className="flex flex-wrap gap-2">
            {browse.map((b) => {
              const Icon = b.icon;
              return (
                <Link
                  key={b.label}
                  to={b.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-secondary/70"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {b.label}
                </Link>
              );
            })}
          </div>

          <div className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Topics
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {topics.map((t) => {
              const Icon = t.icon;
              return (
                <Link
                  key={t.label}
                  to={t.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-secondary/60"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary/70">
                    <Icon className={cn("h-5 w-5", t.tint)} />
                  </span>
                  <span className="text-sm font-medium text-foreground">{t.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}