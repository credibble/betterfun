import { Router } from "express";
import type { DataSource } from "typeorm";
import { AuthService } from "./auth.service.js";
import { requireAuth, type AuthenticatedRequest } from "./auth.middleware.js";
import { AuthNonceRequest, AuthVerifyRequest, AuthRefreshRequest } from "@betterfun/shared";

export function buildAuthRoutes(dataSource: DataSource) {
  const router = Router();
  const service = new AuthService(dataSource);

  // POST /auth/nonce — get a SIWE nonce for a wallet address
  router.post("/nonce", async (req, res) => {
    try {
      const parsed = AuthNonceRequest.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
        return;
      }

      const { nonce, statement } = await service.getNonce(parsed.data.address);
      res.json({ nonce, statement });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(400).json({ error: message });
    }
  });

  // POST /auth/verify — verify SIWE signature, get JWT pair
  router.post("/verify", async (req, res) => {
    try {
      const parsed = AuthVerifyRequest.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
        return;
      }

      const { accessToken, refreshToken, user } = await service.verifyAndIssue(
        parsed.data.message,
        parsed.data.signature as `0x${string}`,
      );

      res.json({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(400).json({ error: message });
    }
  });

  // POST /auth/refresh — rotate refresh token
  router.post("/refresh", async (req, res) => {
    try {
      const parsed = AuthRefreshRequest.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
        return;
      }

      const { accessToken, refreshToken } = await service.refresh(parsed.data.refreshToken);
      res.json({ accessToken, refreshToken });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(401).json({ error: message });
    }
  });

  // GET /auth/me — get current user (requires auth)
  router.get("/me", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await service.getById(req.claims!.sub);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json({
        id: user.id,
        walletAddress: user.walletAddress,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal error";
      res.status(500).json({ error: message });
    }
  });

  return router;
}
