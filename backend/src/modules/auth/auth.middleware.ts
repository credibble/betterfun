import { type Request, type Response, type NextFunction } from "express";
import { verifyToken } from "./jwt.js";
import type { JwtClaims } from "@betterfun/shared";

export interface AuthenticatedRequest extends Request {
  claims?: JwtClaims;
}

/**
 * Middleware that validates JWT from Authorization header and attaches claims to req.
 */
export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = header.slice(7);
  const claims = verifyToken(token);
  if (!claims) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.claims = claims;
  next();
}

/**
 * Require trader role.
 */
export function requireTrader(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  if (!req.claims || (req.claims.role !== "trader" && req.claims.role !== "admin")) {
    res.status(403).json({ error: "Trader access required" });
    return;
  }
  next();
}
