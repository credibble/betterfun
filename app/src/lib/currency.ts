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
