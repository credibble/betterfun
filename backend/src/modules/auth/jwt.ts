import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import type { JwtClaims } from "@betterfun/shared";

const ALGORITHM = "HS256";

function parseDuration(s: string): number {
  const match = s.match(/^(\d+)([smhd])$/);
  if (!match) return 900; // default 15m
  const [, val, unit] = match;
  const n = parseInt(val!, 10);
  switch (unit) {
    case "s": return n;
    case "m": return n * 60;
    case "h": return n * 3600;
    case "d": return n * 86400;
    default: return 900;
  }
}

export function signAccessToken(claims: {
  sub: string;
  address: string;
  role: "user" | "trader" | "admin";
  traderId?: string;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const expires = parseDuration(env.JWT_EXPIRES_IN);
  return jwt.sign(
    { ...claims, iat: now, exp: now + expires },
    env.JWT_SECRET,
    { algorithm: ALGORITHM },
  );
}

export function signRefreshToken(address: string): string {
  const now = Math.floor(Date.now() / 1000);
  const expires = parseDuration(env.JWT_REFRESH_EXPIRES_IN);
  return jwt.sign(
    { sub: address, type: "refresh", iat: now, exp: now + expires },
    env.JWT_SECRET,
    { algorithm: ALGORITHM },
  );
}

export function verifyToken(token: string): JwtClaims | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: [ALGORITHM],
    });
    if (typeof decoded === "string") return null;
    if ((decoded as Record<string, unknown>).type === "refresh") return null;
    return decoded as JwtClaims;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): { sub: string } | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: [ALGORITHM],
    });
    if (typeof decoded === "string") return null;
    if ((decoded as Record<string, unknown>).type !== "refresh") return null;
    return decoded as { sub: string };
  } catch {
    return null;
  }
}
