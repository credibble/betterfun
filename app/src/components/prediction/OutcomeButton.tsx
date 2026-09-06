import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";

interface OutcomeButtonProps {
  outcome: "yes" | "no";
  price: number;
  onClick?: (e?: React.MouseEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  selected?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function OutcomeButton({
  outcome,
  price,
  onClick,
  disabled,
  loading,
  selected,
  size = "md",
  className,
}: OutcomeButtonProps) {
  const isYes = outcome === "yes";

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-2 text-sm",
    lg: "px-4 py-3 text-base",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "relative flex items-center justify-center gap-1.5 rounded-lg font-bold transition-all duration-150",
        "active:translate-y-[2px] disabled:opacity-50 disabled:active:translate-y-0",
        sizeClasses[size],
        isYes
          ? "bg-up text-white hover:brightness-110"
          : "bg-down text-white hover:brightness-110",
        selected && "ring-2 ring-white/30",
        className,
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          {isYes ? (
            <ArrowUpRight className="h-4 w-4" />
          ) : (
            <ArrowDownRight className="h-4 w-4" />
          )}
          <span>{isYes ? "YES" : "NO"}</span>
          <span className="opacity-80">{(price * 100).toFixed(0)}¢</span>
        </>
      )}
    </button>
  );
}
