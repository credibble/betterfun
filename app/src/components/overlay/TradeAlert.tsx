import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, X } from "lucide-react";

type TradeAlertProps = {
  side: "buy_up" | "buy_down" | "sell";
  marketTitle?: string;
  price?: number;
  size?: number;
  onDismiss?: () => void;
  className?: string;
};

export default function TradeAlert({
  side,
  marketTitle,
  price,
  size,
  onDismiss,
  className,
}: TradeAlertProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!visible) return null;

  const sideConfig = {
    buy_up: { label: "BUY YES", color: "bg-green-500", icon: ArrowUpRight },
    buy_down: { label: "BUY NO", color: "bg-blue-500", icon: ArrowDownRight },
    sell: { label: "SELL", color: "bg-red-500", icon: ArrowDownRight },
  };

  const config = sideConfig[side];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "animate-in slide-in-from-right-full fixed top-20 right-4 z-50 flex items-center gap-3 rounded-lg border bg-background shadow-lg p-3 w-72",
        className
      )}
    >
      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", config.color)}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] h-4">
            {config.label}
          </Badge>
          {price != null && (
            <span className="text-xs font-medium">@${price.toFixed(2)}</span>
          )}
        </div>
        {marketTitle && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{marketTitle}</p>
        )}
        {size != null && (
          <p className="text-xs text-muted-foreground">${size.toFixed(0)}</p>
        )}
      </div>
      <button
        onClick={() => {
          setVisible(false);
          onDismiss?.();
        }}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
