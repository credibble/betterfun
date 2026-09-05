import { useEffect, useId, useState } from "react";
import { percentPoints } from "@/lib/chart-paths";
import { ChartGrid, ChartSeriesLayer } from "@/components/market/ChartLayers";

export function Sparkline({
  data,
  color = "hsl(var(--up))",
  height = 40,
  live = false,
}: {
  data: number[];
  color?: string;
  height?: number;
  /** Animate the tip dot on each data shift (for live charts). */
  live?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const [tick, setTick] = useState(0);
  const isLarge = height >= 80;
  const W = isLarge ? 760 : 120;
  const H = height;
  const padT = isLarge ? 18 : 4;
  const padB = isLarge ? 18 : 4;
  const points = percentPoints(data, W, H, padT, padB);

  useEffect(() => {
    if (!live) return;
    setTick((n) => n + 1);
  }, [data, live]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-full w-full overflow-visible"
    >
      {isLarge && <ChartGrid width={W} height={H} padT={padT} padB={padB} />}
      <ChartSeriesLayer
        points={points}
        width={W}
        height={H}
        color={color}
        gradientId={`spark-${id}`}
        strokeWidth={isLarge ? 2.4 : 1.8}
        showTip={isLarge}
        tipKey={live ? tick : undefined}
      />
    </svg>
  );
}
