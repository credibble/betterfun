import { CHART_GRID_LEVELS, smoothPath, yOfPercent } from "@/lib/chart-paths";

export function ChartGrid({
  width,
  height,
  padT = 18,
  padB = 18,
}: {
  width: number;
  height: number;
  padT?: number;
  padB?: number;
}) {
  return (
    <>
      {CHART_GRID_LEVELS.map((g) => (
        <line
          key={g}
          x1={0}
          x2={width}
          y1={yOfPercent(g, height, padT, padB)}
          y2={yOfPercent(g, height, padT, padB)}
          stroke="hsl(var(--border))"
          strokeWidth={1}
          strokeDasharray="2 6"
        />
      ))}
    </>
  );
}

export function ChartSeriesLayer({
  points,
  width,
  height,
  color,
  gradientId,
  strokeWidth = 2.4,
  showTip = false,
  tipKey,
}: {
  points: [number, number][];
  width: number;
  height: number;
  color: string;
  gradientId: string;
  strokeWidth?: number;
  showTip?: boolean;
  tipKey?: string | number;
}) {
  if (points.length < 2) return null;
  const line = smoothPath(points);
  const area = `${line} L${width},${height} L0,${height} Z`;
  const [lx, ly] = points[points.length - 1];
  const [, prevY] = points[points.length - 2] ?? [lx, ly];
  const rising = ly <= prevY;

  return (
    <g>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showTip && (
        <g key={tipKey} transform={`translate(${lx.toFixed(1)},${ly.toFixed(1)})`}>
          <circle
            className="tip-pulse"
            r={5}
            fill={color}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          />
          <circle
            className={rising ? "tip-jump" : "tip-fall"}
            r={4.5}
            fill={color}
            stroke="hsl(var(--card))"
            strokeWidth={2}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          />
        </g>
      )}
    </g>
  );
}
