import { cn } from "@/lib/utils";

export type ActionPairOption<T extends string> = {
  value: T;
  label: string;
  /** Shown when > 0 (e.g. open order count). */
  badge?: number;
};

/**
 * Classic underline tabs (same look as Mint | Redeem | Orders in TradeBox).
 * Use for paired actions: Stake|Unstake, Deposit|Withdraw, Supply|Withdraw, etc.
 */
export function ActionPairTabs<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (next: T) => void;
  options: readonly ActionPairOption<T>[];
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Action"
      className={cn("flex items-center gap-4 border-b border-border", className)}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        const badge = opt.badge ?? 0;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "-mb-px flex items-center gap-1.5 border-b-2 pb-2 text-sm font-semibold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
            {badge > 0 && (
              <span className="num rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export const DEPOSIT_WITHDRAW_OPTIONS = [
  { value: "deposit" as const, label: "Deposit" },
  { value: "withdraw" as const, label: "Withdraw" },
] as const;

export const STAKE_UNSTAKE_OPTIONS = [
  { value: "stake" as const, label: "Stake" },
  { value: "unstake" as const, label: "Unstake" },
] as const;

export const MINT_REDEEM_OPTIONS = [
  { value: "mint" as const, label: "Mint" },
  { value: "redeem" as const, label: "Redeem" },
] as const;

export const SUPPLY_WITHDRAW_OPTIONS = [
  { value: "supply" as const, label: "Supply" },
  { value: "withdraw" as const, label: "Withdraw" },
] as const;
