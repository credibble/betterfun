/** Catmull-Rom → cubic bezier for a smooth, curvy line. */
export function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

export function yOfPercent(v: number, h: number, padT = 18, padB = 18) {
  return padT + (1 - v / 100) * (h - padT - padB);
}

export function percentPoints(
  data: number[],
  w: number,
  h: number,
  padT = 18,
  padB = 18,
): [number, number][] {
  const step = w / (data.length - 1);
  return data.map((v, i) => [i * step, yOfPercent(v, h, padT, padB)] as [number, number]);
}

export const CHART_GRID_LEVELS = [25, 50, 75] as const;
