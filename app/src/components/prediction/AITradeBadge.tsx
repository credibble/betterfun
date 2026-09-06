import { cn } from "@/lib/utils";
import { Bot } from "lucide-react";

interface AITradeBadgeProps {
  side: string;
  amount: number;
  size?: "sm" | "md";
  className?: string;
}

export function AITradeBadge({ side, amount, size = "sm", className }: AITradeBadgeProps) {
  const isUp = side.includes("up") || side === "buy_up" || side === "sell_up";
  const isBuy = side.startsWith("buy");

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10",
        size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[10px]",
        className,
      )}
      title={`AI ${isBuy ? "bought" : "sold"} ${isUp ? "UP" : "DOWN"}`}
    >
      <Bot className={cn(size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3", "text-primary")} />
      <span className="font-semibold text-primary">
        {isBuy ? "Bought" : "Sold"} {isUp ? "UP" : "DN"} ${amount.toFixed(0)}
      </span>
    </div>
  );
}
