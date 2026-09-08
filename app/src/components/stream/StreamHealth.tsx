import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, AlertTriangle } from "lucide-react";

type StreamHealthProps = {
  bitrate?: number;
  latency?: number;
  resolution?: string;
  status?: "good" | "fair" | "poor" | "offline";
  className?: string;
};

export default function StreamHealth({
  bitrate = 0,
  latency = 0,
  resolution = "1080p",
  status = "good",
  className,
}: StreamHealthProps) {
  const statusConfig = {
    good: { color: "bg-green-500", icon: Wifi, label: "Good" },
    fair: { color: "bg-yellow-500", icon: AlertTriangle, label: "Fair" },
    poor: { color: "bg-red-500", icon: WifiOff, label: "Poor" },
    offline: { color: "bg-gray-500", icon: WifiOff, label: "Offline" },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn("flex items-center gap-3 text-xs text-muted-foreground", className)}>
      <div className="flex items-center gap-1">
        <div className={cn("h-2 w-2 rounded-full", config.color)} />
        <Icon className="h-3 w-3" />
        <span>{config.label}</span>
      </div>
      {status !== "offline" && (
        <>
          <span>{resolution}</span>
          <span>{bitrate > 0 ? `${(bitrate / 1000).toFixed(0)} kbps` : "---"}</span>
          <span>{latency > 0 ? `${latency}ms` : "---"}</span>
        </>
      )}
    </div>
  );
}
