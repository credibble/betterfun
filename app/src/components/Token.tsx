import usdcImg from "@/assets/usdc.png";
import xpImg from "@/assets/xp.png";
import { cn } from "@/lib/utils";
import { fmtNum, stripSymbol } from "@/lib/currency";

export function B3TRIcon({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={usdcImg}
      alt="USDC"
      width={size}
      height={size}
      loading="lazy"
      className={cn(
        "inline-block shrink-0 rounded-[4px] object-contain align-[-0.18em]",
        className,
      )}
    />
  );
}

export function XPIcon({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={xpImg}
      alt="XP"
      width={size}
      height={size}
      loading="lazy"
      className={cn(
        "inline-block shrink-0 object-contain align-[-0.18em]",
        className,
      )}
    />
  );
}

/**
 * B3TR amount — leading token icon followed by the number (replaces a "$" prefix).
 * Pass either `amount` (number) or `text` (a preformatted string; a leading "$" is stripped).
 */
export function B3TR({
  amount,
  text,
  compact = false,
  iconSize = 16,
  className,
  iconClassName,
}: {
  amount?: number;
  text?: string;
  compact?: boolean;
  iconSize?: number;
  className?: string;
  iconClassName?: string;
}) {
  const label = text != null ? stripSymbol(text) : fmtNum(amount ?? 0, compact);
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap", className)}>
      <B3TRIcon size={iconSize} className={iconClassName} />
      <span className="num">{label}</span>
    </span>
  );
}

/** XP points — the number followed by a trailing XP icon. */
export function XP({
  amount,
  text,
  compact = false,
  iconSize = 16,
  className,
  iconClassName,
}: {
  amount?: number;
  text?: string;
  compact?: boolean;
  iconSize?: number;
  className?: string;
  iconClassName?: string;
}) {
  const label = text != null ? text : fmtNum(amount ?? 0, compact);
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap", className)}>
      <span className="num">{label}</span>
      <XPIcon size={iconSize} className={iconClassName} />
    </span>
  );
}
