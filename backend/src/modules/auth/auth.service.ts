import { type DataSource } from "typeorm";
import { v4 as uuid } from "uuid";
import { User } from "./user.entity.js";
import { TraderProfile } from "../traders/trader-profile.entity.js";
import { buildSiweMessage, verifySiweSignature } from "./siwe.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "./jwt.js";
import { WalletAddress } from "@betterfun/shared";

export class AuthService {
  private userRepo;
  private traderRepo;

  constructor(private dataSource: DataSource) {
    this.userRepo = dataSource.getRepository(User);
    this.traderRepo = dataSource.getRepository(TraderProfile);
  }

  /**
   * Generate a fresh nonce for a wallet address.
   */
  async getNonce(address: string): Promise<{ nonce: string; statement: string }> {
    const validated = WalletAddress.safeParse(address);
    if (!validated.success) {
      throw new Error("Invalid wallet address");
    }

    const nonce = uuid();
    const lowerAddr = validated.data.toLowerCase();

    // Upsert: create or update nonce for this address
    let user = await this.userRepo.findOne({ where: { walletAddress: lowerAddr } });
    if (!user) {
      user = this.userRepo.create({ walletAddress: lowerAddr, nonce });
    } else {
      user.nonce = nonce;
    }
    await this.userRepo.save(user);

    const message = buildSiweMessage({ address: lowerAddr, nonce, chainId: 50312 });
    return { nonce, statement: message };
  }

  /**
   * Verify SIWE signature, issue JWT pair.
   */
  async verifyAndIssue(
    messageStr: string,
    signature: `0x${string}`,
  ): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    const result = await verifySiweSignature(messageStr, signature);
    if (!result) {
      throw new Error("Invalid SIWE signature");
    }

    // Verify the nonce matches (replay protection)
    const user = await this.userRepo.findOne({ where: { walletAddress: result.address } });
    if (!user) {
      throw new Error("User not found — generate nonce first");
    }

    // Invalidate used nonce
    const newNonce = uuid();
    user.nonce = newNonce;
    await this.userRepo.save(user);

    // Detect existing trader profile so the JWT role is correct on every login.
    const trader = await this.traderRepo.findOne({ where: { userId: user.id } });
    const role: "user" | "trader" = trader ? "trader" : "user";

    const accessToken = signAccessToken({
      sub: user.id,
      address: user.walletAddress,
      role,
      ...(trader ? { traderId: trader.id } : {}),
    });

    const refreshToken = signRefreshToken(user.walletAddress);

    return { accessToken, refreshToken, user };
  }

  /**
   * Refresh an access token using a valid refresh token.
   */
  async refresh(refreshTokenStr: string): Promise<{ accessToken: string; refreshToken: string }> {
    const decoded = verifyRefreshToken(refreshTokenStr);
    if (!decoded) {
      throw new Error("Invalid or expired refresh token");
    }

    const user = await this.userRepo.findOne({ where: { walletAddress: decoded.sub } });
    if (!user) {
      throw new Error("User not found");
    }

    // Detect existing trader profile so the JWT role is correct on refresh.
    const trader = await this.traderRepo.findOne({ where: { userId: user.id } });
    const role: "user" | "trader" = trader ? "trader" : "user";

    const accessToken = signAccessToken({
      sub: user.id,
      address: user.walletAddress,
      role,
      ...(trader ? { traderId: trader.id } : {}),
    });

    const refreshToken = signRefreshToken(user.walletAddress);

    return { accessToken, refreshToken };
  }

  /**
   * Get user by ID.
   */
  async getById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }
}
