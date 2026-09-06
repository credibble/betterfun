/**
 * Parse DreamDEX market symbols into human-readable prediction market questions.
 *
 * Symbol formats observed:
 *   BTC-7992205-06SEP26-1000/tUSDC
 *   ETH-249816-06SEP26-1005/tUSDC
 *   BTC-0-07SEP26/tUSDC
 *   ETH-0-19OCT26/tUSDC
 *
 * Structure: {ASSET}-{STRIKE}-{DDMMMYY}(-{HHMM})/{COLLATERAL}
 */

const MONTHS: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

export interface ParsedMarket {
  asset: "BTC" | "ETH" | string;
  strike: number;
  strikeFormatted: string;
  expiry: Date | null;
  expiryFormatted: string;
  question: string;
  shortQuestion: string;
  category: "Crypto";
}

export function parseMarketSymbol(symbol: string): ParsedMarket | null {
  if (!symbol) return null;

  // Strip collateral suffix: /tUSDC
  const clean = symbol.split("/")[0];
  const parts = clean.split("-");

  if (parts.length < 3) return null;

  const asset = parts[0];
  const strikeRaw = parts[1];
  const dateStr = parts[2];
  const timeStr = parts[3]; // optional

  // Parse strike price — DreamDEX uses integer cents or raw units
  // e.g., 7992205 could be $79,922.05 (divide by 100) or raw 7992205
  const strikeNum = parseInt(strikeRaw, 10);
  let strike: number;
  if (strikeNum === 0) {
    strike = 0;
  } else if (strikeNum > 1_000_000) {
    // Likely cents with 2 decimal places: 7992205 → 79922.05
    strike = strikeNum / 100;
  } else if (strikeNum > 10_000) {
    // Likely raw: 79922 → $79,922
    strike = strikeNum;
  } else {
    strike = strikeNum;
  }

  // Parse date: DDMMMYY → e.g., 06SEP26 → Sep 6, 2026
  let expiry: Date | null = null;
  const day = parseInt(dateStr.slice(0, 2), 10);
  const monthStr = dateStr.slice(2, 5).toUpperCase();
  const year = parseInt(dateStr.slice(5, 7), 10);
  const month = MONTHS[monthStr];

  if (month != null && !isNaN(day) && !isNaN(year)) {
    expiry = new Date(2000 + year, month, day);

    // Parse time if present: HHMM → hours:minutes
    if (timeStr && timeStr.length === 4) {
      const hours = parseInt(timeStr.slice(0, 2), 10);
      const minutes = parseInt(timeStr.slice(2, 4), 10);
      if (!isNaN(hours) && !isNaN(minutes)) {
        expiry.setHours(hours, minutes, 0, 0);
      }
    } else {
      // Default to end of day
      expiry.setHours(23, 59, 59, 0);
    }
  }

  const strikeFormatted = formatStrike(strike);
  const expiryFormatted = expiry ? formatExpiry(expiry) : "Unknown";

  const question = `Will ${asset} go above $${strikeFormatted} by ${expiryFormatted}?`;
  const shortQuestion = `${asset} > $${strikeFormatted}?`;

  return {
    asset,
    strike,
    strikeFormatted,
    expiry,
    expiryFormatted,
    question,
    shortQuestion,
    category: "Crypto",
  };
}

function formatStrike(price: number): string {
  if (price === 0) return "0";
  if (price >= 1000) {
    return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  return price.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function formatExpiry(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 0) return "Expired";
  if (diffHours < 1) return `${Math.round(diffMs / 60000)}m`;
  if (diffHours < 24) return `${Math.round(diffHours)}h`;

  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate();
  const time = date.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${month} ${day}, ${time}`;
}

export function formatTimeRemaining(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  if (diffMs <= 0) return "Expired";

  const days = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `$${(vol / 1_000).toFixed(0)}K`;
  return `$${vol.toFixed(0)}`;
}
