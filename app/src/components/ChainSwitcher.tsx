import { useState } from "react";
import { toast } from "sonner";
import { Check, ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Chain = {
  id: string;
  name: string;
  short: string;
  color: string;
  desc: string;
};

const chains: Chain[] = [
  { id: "somnia", name: "Somnia Testnet", short: "SOMNIA", color: "#8b5cf6", desc: "Somnia Shannon testnet" },
];

function ChainDot({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 30% 30%, ${color}, ${color}bb)`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white/85" />
    </span>
  );
}

export function ChainSwitcher({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Chain>(chains[0]);

  const select = (c: Chain) => {
    setActive(c);
    setOpen(false);
    toast.success(`Connected to ${c.name}`, {
      description: `Network switched to ${c.desc}.`,
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="Switch network"
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary sm:px-2.5",
            className,
          )}
        >
          <ChainDot color={active.color} />
          <span className="hidden sm:inline">{active.name}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-56 p-1.5">
        <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Select network
        </div>
        {chains.map((c) => {
          const isActive = c.id === active.id;
          return (
            <button
              key={c.id}
              onClick={() => select(c)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-secondary/60",
                isActive && "bg-secondary/50",
              )}
            >
              <ChainDot color={c.color} size={22} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">{c.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{c.desc}</span>
              </span>
              {isActive && <Check className="h-4 w-4 shrink-0 text-primary" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
