import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown } from "lucide-react";

type TradeSignal = {
  id?: string;
  type: "trade_signal";
  trader: string;
  side: "buy_up" | "buy_down" | "sell";
  marketId?: string;
  marketTitle?: string;
  price?: number;
  size?: number;
  timestamp?: number;
};

type TradeSignalMessageProps = {
  signal: TradeSignal;
};

export default function TradeSignalMessage({ signal }: TradeSignalMessageProps) {
  const sideConfig = {
    buy_up: {
      label: "Bought YES",
      icon: ArrowUpRight,
      color: "text-green-500",
      bg: "bg-green-500/10",
      badge: "bg-green-500/20 text-green-500",
    },
    buy_down: {
      label: "Bought NO",
      icon: ArrowDownRight,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      badge: "bg-blue-500/20 text-blue-500",
    },
    sell: {
      label: "Sold",
      icon: TrendingDown,
      color: "text-red-500",
      bg: "bg-red-500/10",
      badge: "bg-red-500/20 text-red-500",
    },
  };

  const config = sideConfig[signal.side] ?? sideConfig.buy_up;
  const Icon = config.icon;

  const time = signal.timestamp
    ? new Date(signal.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className={cn("rounded-lg p-2 border", config.bg)}>
      <div className="flex items-center gap-2">
        <Badge className={cn("text-[10px] h-4", config.badge)}>
          <Icon className="h-3 w-3 mr-0.5" />
          {config.label}
        </Badge>
        <span className="text-xs text-muted-foreground">{signal.trader}</span>
        <span className="text-[10px] text-muted-foreground ml-auto">{time}</span>
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        {signal.marketTitle && (
          <span className="text-xs text-foreground truncate">{signal.marketTitle}</span>
        )}
        {signal.price != null && (
          <span className={cn("text-xs font-medium", config.color)}>
            @${signal.price.toFixed(2)}
          </span>
        )}
        {signal.size != null && (
          <span className="text-xs text-muted-foreground">
            · ${signal.size.toFixed(0)}
          </span>
        )}
      </div>
    </div>
  );
}
