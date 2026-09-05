/** Formatting helpers for the app's two in-app units: B3TR (money) and XP (points). */

export function fmtNum(n: number, compact = false): string {
  if (compact) {
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `${trim(n / 1_000_000)}M`;
    if (abs >= 1_000) return `${trim(n / 1_000)}K`;
    return String(Math.round(n));
  }
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function trim(n: number): string {
  return n.toFixed(1).replace(/\.0$/, "");
}

/** Strip a leading currency symbol (e.g. "$9.2M" -> "9.2M"). */
export function stripSymbol(v: string): string {
  return v.replace(/^\s*\$/, "").trim();
}

/** Plain-text amount for toasts/aria (no icon), e.g. "1,000 B3TR". */
export function fmtB3tr(n: number, compact = false): string {
  return `${fmtNum(n, compact)} B3TR`;
}

export function fmtXp(n: number, compact = false): string {
  return `${fmtNum(n, compact)} XP`;
}
