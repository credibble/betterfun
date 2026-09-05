import { type DataSource } from "typeorm";
import { v4 as uuid } from "uuid";
import { Pot } from "./pot.entity.js";
import { PotShare } from "./pot-share.entity.js";
import { Deposit } from "./deposit.entity.js";
import { Withdrawal } from "./withdrawal.entity.js";
import { Epoch } from "../epochs/epoch.entity.js";
import { derivePotKey, getPotAddress } from "../dreamdex/keys.js";
import { fundGas } from "../dreamdex/fund.js";
import { transferTusdc } from "../dreamdex/transfer.js";
import { verifyTusdcTransfer, isPendingResult } from "../dreamdex/verify.js";
import { broadcast } from "../realtime/ws-hub.js";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

export class PotService {
  private potRepo;
  private shareRepo;
  private depositRepo;
  private withdrawalRepo;
  private epochRepo;

  constructor(private dataSource: DataSource) {
    this.potRepo = dataSource.getRepository(Pot);
    this.shareRepo = dataSource.getRepository(PotShare);
    this.depositRepo = dataSource.getRepository(Deposit);
    this.withdrawalRepo = dataSource.getRepository(Withdrawal);
    this.epochRepo = dataSource.getRepository(Epoch);
  }

  /**
   * Create a new pot for a trader in an epoch.
   */
  async create(input: {
    traderId: string;
    epochId: string;
    strategy: {
      title: string;
      note: string;
      risk: "conservative" | "balanced" | "aggressive";
      focus: string[];
    };
  }): Promise<Pot> {
    // Verify epoch is upcoming
    const epoch = await this.epochRepo.findOne({ where: { id: input.epochId } });
    if (!epoch || epoch.status !== "upcoming") {
      throw new Error("Epoch must be in 'upcoming' status to create a pot");
    }

    // Count existing pots for this epoch to derive the next signer index
    const existingCount = await this.potRepo.count({ where: { epochId: input.epochId } });
    const signerIndex = existingCount;
    const signerAddress = getPotAddress(signerIndex);

    const pot = this.potRepo.create({
      id: uuid(),
      traderId: input.traderId,
      epochId: input.epochId,
      strategy: input.strategy,
      status: "funding",
      cash: 0,
      nav: 0,
      deployed: 0,
      lpPrice: 1,
      sharesOutstanding: 0,
      signerAddress,
      signerIndex,
    });

    const saved = await this.potRepo.save(pot);

    // Update epoch pot count
    await this.epochRepo.update(input.epochId, {
      potCount: existingCount + 1,
    });

    logger.info(`Pot ${saved.id} created for trader ${input.traderId} in epoch ${input.epochId}`);

    // Fund the pot signer with native STT gas (best-effort) so it can trade.
    fundGas(signerAddress).catch((err) =>
      logger.warn(err, `Gas funding for pot signer ${signerAddress} failed — set GAS_FUNDER_PRIVATE_KEY`),
    );

    return saved;
  }

  /**
   * Get all pots, optionally filtered by epoch or trader.
   */
  async list(filters?: { epochId?: string; traderId?: string }): Promise<Pot[]> {
    const where: Record<string, string> = {};
    if (filters?.epochId) where.epochId = filters.epochId;
    if (filters?.traderId) where.traderId = filters.traderId;
    return this.potRepo.find({ where, order: { createdAt: "DESC" } });
  }

  /**
   * Get pot by ID.
   */
  async getById(id: string): Promise<Pot | null> {
    return this.potRepo.findOne({ where: { id } });
  }

  /**
   * Record a deposit as pending (tx seen, not yet fully confirmed).
   */
  async recordPendingDeposit(input: {
    potId: string;
    userId: string;
    amountUsd: number;
    txHash: string;
  }): Promise<Deposit> {
    const deposit = this.depositRepo.create({
      id: uuid(),
      userId: input.userId,
      potId: input.potId,
      amountUsd: input.amountUsd,
      txHash: input.txHash,
      status: "pending",
    });
    const saved = await this.depositRepo.save(deposit);
    logger.info(`Deposit recorded as pending: ${input.amountUsd} USDC to pot ${input.potId} (${input.txHash})`);
    return saved;
  }

  /**
   * Confirm a previously-pending deposit once on-chain verification passes.
   * Returns the credited share, or null if still not confirmable.
   */
  async confirmPendingDeposit(depositId: string): Promise<PotShare | null> {
    const deposit = await this.depositRepo.findOne({ where: { id: depositId } });
    if (!deposit || deposit.status !== "pending") return null;

    const pot = await this.potRepo.findOne({ where: { id: deposit.potId } });
    if (!pot) return null;

    const verified = await verifyTusdcTransfer({
      txHash: deposit.txHash as `0x${string}`,
      toAddress: pot.signerAddress as `0x${string}`,
      amountUsd: Number(deposit.amountUsd),
      confirmations: env.DEPOSIT_CONFIRM_BLOCKS,
    });

    if (!verified.ok) {
      if (isPendingResult(verified)) return null; // still waiting
      deposit.status = "failed";
      await this.depositRepo.save(deposit);
      logger.warn(`Deposit ${depositId} failed verification: ${verified.reason}`);
      return null;
    }

    deposit.status = "confirmed";
    await this.depositRepo.save(deposit);
    return this.creditDeposit({
      potId: deposit.potId,
      userId: deposit.userId,
      amountUsd: Number(deposit.amountUsd),
      txHash: deposit.txHash,
    });
  }

  /**
   * Get deposits for a pot.
   */
  async getDeposits(potId: string): Promise<Deposit[]> {
    return this.depositRepo.find({ where: { potId }, order: { createdAt: "DESC" } });
  }

  /**
   * Record a confirmed deposit and mint shares.
   */
  async creditDeposit(input: {
    potId: string;
    userId: string;
    amountUsd: number;
    txHash: string;
  }): Promise<PotShare> {
    const pot = await this.potRepo.findOne({ where: { id: input.potId } });
    if (!pot) throw new Error("Pot not found");
    if (pot.status !== "funding") throw new Error("Pot is not accepting deposits");

    // Idempotency: a txHash that was already confirmed must not double-credit.
    const existing = await this.depositRepo.findOne({ where: { txHash: input.txHash, potId: input.potId } });
    if (existing && existing.status === "confirmed") {
      const share = await this.shareRepo.findOne({ where: { userId: input.userId, potId: input.potId } });
      if (share) return share;
    }

    // Record deposit
    const deposit = this.depositRepo.create({
      id: uuid(),
      userId: input.userId,
      potId: input.potId,
      amountUsd: input.amountUsd,
      txHash: input.txHash,
      status: "confirmed",
    });
    await this.depositRepo.save(deposit);

    // Mint shares at 1:1
    let share = await this.shareRepo.findOne({
      where: { userId: input.userId, potId: input.potId },
    });

    if (share) {
      share.shares = Number(share.shares) + input.amountUsd;
      share.investedUsd = Number(share.investedUsd) + input.amountUsd;
    } else {
      share = this.shareRepo.create({
        id: uuid(),
        userId: input.userId,
        potId: input.potId,
        shares: input.amountUsd,
        investedUsd: input.amountUsd,
        claimableUsd: 0,
      });
    }
    await this.shareRepo.save(share);

    // Update pot totals — decimal columns come back as strings from PG, so use
    // Number() arithmetic (never `+=`/`-=` directly on the loaded entity).
    pot.cash = Number(pot.cash) + input.amountUsd;
    pot.nav = Number(pot.nav) + input.amountUsd;
    pot.sharesOutstanding = Number(pot.sharesOutstanding) + input.amountUsd;
    await this.potRepo.save(pot);

    // Update epoch TVL
    const epoch = await this.epochRepo.findOne({ where: { id: pot.epochId } });
    if (epoch) {
      epoch.tvl = Number(epoch.tvl) + input.amountUsd;
      await this.epochRepo.save(epoch);
    }

    logger.info(`Deposit credited: ${input.amountUsd} USDC to pot ${input.potId} by user ${input.userId}`);

    broadcast(`pot:${pot.id}`, {
      type: "pot:update",
      potId: pot.id,
      nav: Number(pot.nav),
      cash: Number(pot.cash),
      deployed: Number(pot.deployed),
      lpPrice: Number(pot.lpPrice),
    });

    return share;
  }

  /**
   * Withdraw before epoch starts — refunds tUSDC on-chain from the pot signer
   * to the user's wallet, then burns the pro-rata shares.
   */
  async withdraw(input: {
    potId: string;
    userId: string;
    userAddress: string;
    amountUsd: number;
  }): Promise<Withdrawal> {
    const pot = await this.potRepo.findOne({ where: { id: input.potId } });
    if (!pot) throw new Error("Pot not found");

    // Only while the pot is funding (epoch still upcoming / pre-lock)
    if (pot.status !== "funding") {
      throw new Error("Can only withdraw while the pot is in funding");
    }

    const epoch = await this.epochRepo.findOne({ where: { id: pot.epochId } });
    if (!epoch || epoch.status !== "upcoming") {
      throw new Error("Can only withdraw before epoch starts");
    }

    const share = await this.shareRepo.findOne({
      where: { userId: input.userId, potId: input.potId },
    });
    if (!share || share.shares < input.amountUsd) {
      throw new Error("Insufficient shares");
    }

    // Refund tUSDC on-chain FIRST (transfer-or-fail, no partial ledger change).
    const privateKey = derivePotKey(pot.signerIndex) as `0x${string}`;
    const { hash } = await transferTusdc({
      fromPrivateKey: privateKey,
      to: input.userAddress as `0x${string}`,
      amountUsd: input.amountUsd,
    });

    // Record withdrawal (completed)
    const withdrawal = this.withdrawalRepo.create({
      id: uuid(),
      userId: input.userId,
      potId: input.potId,
      amountUsd: input.amountUsd,
      txHash: hash,
      status: "completed",
    });
    await this.withdrawalRepo.save(withdrawal);

    // Burn shares — Number() arithmetic on decimal string columns.
    share.shares = Math.max(0, Number(share.shares) - input.amountUsd);
    share.investedUsd = Math.max(0, Number(share.investedUsd) - input.amountUsd);
    if (share.shares <= 0) {
      await this.shareRepo.remove(share);
    } else {
      await this.shareRepo.save(share);
    }

    // Update pot totals
    pot.cash = Math.max(0, Number(pot.cash) - input.amountUsd);
    pot.nav = Math.max(0, Number(pot.nav) - input.amountUsd);
    pot.sharesOutstanding = Math.max(0, Number(pot.sharesOutstanding) - input.amountUsd);
    await this.potRepo.save(pot);

    // Update epoch TVL
    if (epoch) {
      epoch.tvl = Math.max(0, Number(epoch.tvl) - input.amountUsd);
      await this.epochRepo.save(epoch);
    }

    logger.info(`Withdrawal: ${input.amountUsd} USDC from pot ${input.potId} by user ${input.userId} (${hash})`);

    broadcast(`pot:${pot.id}`, {
      type: "pot:update",
      potId: pot.id,
      nav: Number(pot.nav),
      cash: Number(pot.cash),
      deployed: Number(pot.deployed),
      lpPrice: Number(pot.lpPrice),
    });

    return withdrawal;
  }

  /**
   * Get shares for a pot.
   */
  async getShares(potId: string): Promise<PotShare[]> {
    return this.shareRepo.find({ where: { potId } });
  }

  /**
   * Transition pot status.
   */
  async setStatus(potId: string, status: Pot["status"]): Promise<Pot | null> {
    const pot = await this.potRepo.findOne({ where: { id: potId } });
    if (!pot) return null;
    pot.status = status;
    return this.potRepo.save(pot);
  }

  /**
   * Update pot NAV (called by trading engine).
   */
  async updateNav(potId: string, nav: number, cash: number, deployed: number): Promise<void> {
    await this.potRepo.update(potId, { nav, cash, deployed });
  }
}
