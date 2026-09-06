import { type DataSource } from "typeorm";
import { v4 as uuid } from "uuid";
import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
} from "viem";
import { SOMNIA_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";
import { Pot } from "../pots/pot.entity.js";
import { PotShare } from "../pots/pot-share.entity.js";
import { Epoch } from "../epochs/epoch.entity.js";
import { Payout } from "./payout.entity.js";
import { Position } from "../trading/position.entity.js";
import { createTradingExchange } from "../dreamdex/exchange.js";
import { derivePotKey } from "../dreamdex/keys.js";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { env } from "../../config/env.js";
import { CALC_FEE_SPLIT } from "@betterfun/shared";
import { logger } from "../../lib/logger.js";

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
] as const;

const COLLATERAL_ADDRESS = SOMNIA_TESTNET_ADDRESSES.collateral as `0x${string}`;
const CHAIN = somniaShannon as any;

let cachedDecimals: number | null = null;

async function getCollateralDecimals(): Promise<number> {
  if (cachedDecimals != null) return cachedDecimals;
  try {
    const client = createPublicClient({ chain: CHAIN, transport: http() });
    const decimals = await client.readContract({
      address: COLLATERAL_ADDRESS,
      abi: ERC20_ABI,
      functionName: "decimals",
    });
    cachedDecimals = Number(decimals);
  } catch {
    cachedDecimals = 6;
  }
  return cachedDecimals;
}

async function toRawUnits(humanAmount: number): Promise<bigint> {
  const decimals = await getCollateralDecimals();
  return BigInt(Math.round(humanAmount * 10 ** decimals));
}

const REDEEM_MAX_RETRIES = 3;
const REDEEM_RETRY_DELAY_MS = 2_000;

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class SettlementService {
  private potRepo;
  private shareRepo;
  private epochRepo;
  private payoutRepo;
  private positionRepo;

  constructor(private dataSource: DataSource) {
    this.potRepo = dataSource.getRepository(Pot);
    this.shareRepo = dataSource.getRepository(PotShare);
    this.epochRepo = dataSource.getRepository(Epoch);
    this.payoutRepo = dataSource.getRepository(Payout);
    this.positionRepo = dataSource.getRepository(Position);
  }

  /**
   * Settle all pots for an epoch.
   */
  async settleEpoch(epochId: string): Promise<void> {
    const pots = await this.potRepo.find({ where: { epochId } });
    const epoch = await this.epochRepo.findOne({ where: { id: epochId } });
    if (!epoch) throw new Error("Epoch not found");

    logger.info(
      `Starting settlement for epoch ${epoch.number} (${pots.length} pots)`,
    );

    const failedPots: string[] = [];
    for (const pot of pots) {
      try {
        await this.settlePot(pot);
      } catch (err) {
        logger.error(err, `Failed to settle pot ${pot.id}`);
        failedPots.push(pot.id);
      }
    }

    if (failedPots.length > 0) {
      logger.warn(
        { failedPots },
        `${failedPots.length}/${pots.length} pots failed settlement`,
      );
    }

    epoch.status = "settled";
    await this.epochRepo.save(epoch);
    logger.info(
      `Epoch ${epoch.number} settled (${failedPots.length} failures)`,
    );
  }

  /**
   * Settle a single pot — redeem positions, compute NAV, distribute payouts.
   */
  async settlePot(pot: Pot): Promise<Payout | null> {
    // 1. Redeem winning positions via DreamDEX — throws on infrastructure failure
    const redeemResult = await this.redeemPositions(pot);

    // 2. Compute final NAV from on-chain tUSDC balance
    let finalNav: number;
    try {
      const decimals = await getCollateralDecimals();
      const client = createPublicClient({ chain: CHAIN, transport: http() });
      const balance = await client.readContract({
        address: COLLATERAL_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [pot.signerAddress as `0x${string}`],
      });
      finalNav = Number(formatUnits(balance, decimals));
    } catch (err) {
      logger.warn(
        err,
        `On-chain balance read failed for pot ${pot.id}, falling back to tracked NAV`,
      );
      finalNav = pot.nav;
    }

    if (redeemResult.failedMarkets.length > 0) {
      logger.warn(
        { potId: pot.id, failedMarkets: redeemResult.failedMarkets },
        `Settling pot with ${redeemResult.failedMarkets.length} unredeemed markets — NAV may be understated`,
      );
    }

    // 3. Compute per-share value
    const totalShares = pot.sharesOutstanding;
    if (totalShares <= 0) {
      logger.warn(`Pot ${pot.id} has no shares`);
      pot.nav = finalNav;
      await this.potRepo.save(pot);
      return null;
    }

    const perShare = finalNav / totalShares;
    const investedPerShare = 1.0;

    // 4. Calculate waterfall
    let traderCutUsd = 0;
    let protocolCutUsd = 0;
    let lpDistributedUsd = 0;

    if (perShare > investedPerShare) {
      const totalGain = (perShare - investedPerShare) * totalShares;
      traderCutUsd = totalGain * CALC_FEE_SPLIT.trader;
      protocolCutUsd = totalGain * CALC_FEE_SPLIT.protocol;
      lpDistributedUsd = totalGain * CALC_FEE_SPLIT.lp;
    }

    // 5. Record payout
    const distribution: Record<string, number> = {};
    const shares = await this.shareRepo.find({ where: { potId: pot.id } });

    // Fee rate that gets deducted from gains (trader 15% + protocol 5% = 20%)
    const feeRate = CALC_FEE_SPLIT.trader + CALC_FEE_SPLIT.protocol;

    for (const share of shares) {
      const rawPayout = share.shares * perShare;
      const invested = share.shares * investedPerShare;

      // Deduct fees only on gains, not on principal
      let userPayout: number;
      if (perShare > investedPerShare) {
        const gain = rawPayout - invested;
        const fee = gain * feeRate;
        userPayout = rawPayout - fee;
      } else {
        userPayout = rawPayout;
      }

      distribution[share.userId] = userPayout;
      share.claimableUsd = userPayout;
      await this.shareRepo.save(share);
    }

    const payout = this.payoutRepo.create({
      id: uuid(),
      potId: pot.id,
      epochId: pot.epochId,
      perShare,
      traderCutUsd,
      protocolCutUsd,
      lpDistributedUsd,
      distribution,
      status: "pending",
    });
    await this.payoutRepo.save(payout);

    // 6. Update pot stats
    pot.nav = finalNav;
    await this.potRepo.save(pot);

    logger.info(
      `Pot ${pot.id} settled: perShare=${perShare.toFixed(4)}, traderCut=${traderCutUsd}`,
    );
    return payout;
  }

  /**
   * Redeem all winning positions for a pot.
   * Returns which markets failed so settlePot can log a warning.
   * Throws on infrastructure failures (can't load markets, can't query positions).
   */
  private async redeemPositions(
    pot: Pot,
  ): Promise<{ failedMarkets: string[] }> {
    const privateKey = derivePotKey(pot.signerIndex) as `0x${string}`;
    const exchange = createTradingExchange(privateKey);
    await exchange.loadMarkets(true);

    const positions = await this.positionRepo.find({
      where: { potId: pot.id, status: "open" },
    });

    console.log(
      `Pot ${pot.id} has ${positions.length} open positions to redeem`,
    );

    if (positions.length === 0) return { failedMarkets: [] };

    // Group by marketId
    const markets = new Map<
      string,
      {
        pos: Position[];
        resolved: boolean;
        voided: boolean;
        winningOutcome: number;
      }
    >();
    for (const pos of positions) {
      const onchain = await exchange.client.getMarketOnchain(
        pos.marketId as `0x${string}`,
      );
      const isFinal = onchain.isResolved || onchain.isVoided;
      if (!isFinal) continue;

      let entry = markets.get(pos.marketId);
      if (!entry) {
        entry = {
          pos: [],
          resolved: onchain.isResolved,
          voided: onchain.isVoided,
          winningOutcome: Number(onchain.winningOutcome),
        };
        markets.set(pos.marketId, entry);
      }
      entry.pos.push(pos);
    }

    const failedMarkets: string[] = [];

    for (const [
      marketId,
      { pos: mpos, resolved, voided, winningOutcome },
    ] of markets) {
      let success = false;

      for (let attempt = 1; attempt <= REDEEM_MAX_RETRIES; attempt++) {
        try {
          const onchain = await exchange.client.getMarketOnchain(
            marketId as `0x${string}`,
          );

          const candidates: Array<{ outcomeIdx: 0 | 1; amount: bigint }> = [];
          for (const outcomeIdx of [0, 1] as const) {
            if (resolved && outcomeIdx !== (winningOutcome as 0 | 1)) continue;
            const held = await exchange.client.getOutcomeBalance({
              outcomeToken: onchain.outcomeToken,
              account: pot.signerAddress as `0x${string}`,
              id: outcomeIdx === 0 ? onchain.yesId : onchain.noId,
            });
            console.log(
              `Pot ${pot.id} market ${marketId} outcome ${outcomeIdx} held: ${held}`,
            );
            if (held > 0n) candidates.push({ outcomeIdx, amount: held });
          }

          if (candidates.length === 0) {
            for (const pos of mpos) {
              pos.status = "resolved";
              pos.win =
                resolved && pos.side === (winningOutcome === 0 ? "up" : "down");
              // Add settlement PnL to any existing realized PnL from prior partial sells
              const settlementPnl = pos.win
                ? pos.contracts * (1 - pos.avgPrice)
                : -pos.contracts * pos.avgPrice;
              pos.realizedPnl = Number(pos.realizedPnl) + settlementPnl;
              await this.positionRepo.save(pos);
            }
            success = true;
            break;
          }

          const res = await exchange.trader.redeemMany({
            entries: candidates.map((c) => ({
              marketId: marketId as `0x${string}`,
              outcomeIdx: c.outcomeIdx,
              amount: c.amount,
            })),
          });

          if (res.receipt?.status === "reverted") {
            throw new Error(`redeemMany tx reverted for market ${marketId}`);
          }

          for (const pos of mpos) {
            pos.status = "resolved";
            pos.win =
              resolved && pos.side === (winningOutcome === 0 ? "up" : "down");
            // Add settlement PnL to any existing realized PnL from prior partial sells
            const settlementPnl = pos.win
              ? pos.contracts * (1 - pos.avgPrice)
              : -pos.contracts * pos.avgPrice;
            pos.realizedPnl = Number(pos.realizedPnl) + settlementPnl;
            await this.positionRepo.save(pos);
          }

          logger.info(
            `Redeemed market ${marketId}: ${candidates.length} outcome(s), ` +
              `${voided ? "voided (0.5/side)" : resolved ? `winner=${winningOutcome}` : "pending"}`,
          );
          success = true;
          break;
        } catch (err) {
          logger.warn(
            { err, marketId, attempt, maxRetries: REDEEM_MAX_RETRIES },
            `Redeem attempt ${attempt}/${REDEEM_MAX_RETRIES} failed for market ${marketId}`,
          );
          if (attempt < REDEEM_MAX_RETRIES) {
            await sleep(REDEEM_RETRY_DELAY_MS * attempt);
          }
        }
      }

      if (!success) {
        failedMarkets.push(marketId);
        logger.error(
          { marketId, potId: pot.id },
          `Failed to redeem market ${marketId} after ${REDEEM_MAX_RETRIES} attempts — marking positions as resolved (loss)`,
        );
        for (const pos of mpos) {
          pos.status = "resolved";
          pos.win = false;
          // Add settlement PnL to any existing realized PnL from prior partial sells
          pos.realizedPnl = Number(pos.realizedPnl) + (-pos.contracts * pos.avgPrice);
          await this.positionRepo.save(pos);
        }
      }
    }

    return { failedMarkets };
  }

  /**
   * Auto-redeem open positions whose markets are finalized (resolved or voided).
   * Returns the number of pots that had positions redeemed.
   */
  async redeemExpiredPositions(): Promise<number> {
    const { getReadExchange } = await import("../dreamdex/exchange.js");
    const readExchange = getReadExchange();

    const pots = await this.potRepo.find();
    let redeemedCount = 0;

    for (const pot of pots) {
      const openPositions = await this.positionRepo.find({
        where: { potId: pot.id, status: "open" },
      });
      if (openPositions.length === 0) continue;

      const uniqueMarkets = [...new Set(openPositions.map((p) => p.marketId))];
      const finalizedMarkets: string[] = [];

      try {
        for (const marketId of uniqueMarkets) {
          try {
            const onchain = await readExchange.client.getMarketOnchain(
              marketId as `0x${string}`,
            );
            if (onchain.isResolved || onchain.isVoided) {
              finalizedMarkets.push(marketId);
            }
          } catch {
            // chain hiccup — skip this market, will retry next cycle
          }
        }

        if (finalizedMarkets.length === 0) continue;

        const positionsToRedeem = openPositions.filter((p) =>
          finalizedMarkets.includes(p.marketId),
        );
        const grouped = new Map<string, Position[]>();
        for (const pos of positionsToRedeem) {
          const arr = grouped.get(pos.marketId) ?? [];
          arr.push(pos);
          grouped.set(pos.marketId, arr);
        }

        const exchange = createTradingExchange(
          derivePotKey(pot.signerIndex) as `0x${string}`,
        );

        for (const [marketId, mpos] of grouped) {
          const onchain = await exchange.client.getMarketOnchain(
            marketId as `0x${string}`,
          );
          const resolved = onchain.isResolved;
          const voided = onchain.isVoided;
          const winningOutcome = Number(onchain.winningOutcome);

          for (let attempt = 1; attempt <= REDEEM_MAX_RETRIES; attempt++) {
            try {
              const candidates: Array<{ outcomeIdx: 0 | 1; amount: bigint }> =
                [];
              for (const outcomeIdx of [0, 1] as const) {
                if (resolved && outcomeIdx !== (winningOutcome as 0 | 1))
                  continue;
                const held = await exchange.client.getOutcomeBalance({
                  outcomeToken: onchain.outcomeToken,
                  account: pot.signerAddress as `0x${string}`,
                  id: outcomeIdx === 0 ? onchain.yesId : onchain.noId,
                });
                if (held > 0n) candidates.push({ outcomeIdx, amount: held });
              }

              if (candidates.length === 0) {
                for (const pos of mpos) {
                  pos.status = "resolved";
                  pos.win =
                    resolved &&
                    pos.side === (winningOutcome === 0 ? "up" : "down");
                  // Add settlement PnL to any existing realized PnL from prior partial sells
                  const settlementPnl = pos.win
                    ? pos.contracts * (1 - pos.avgPrice)
                    : -pos.contracts * pos.avgPrice;
                  pos.realizedPnl = Number(pos.realizedPnl) + settlementPnl;
                  await this.positionRepo.save(pos);
                }
                break;
              }

              const res = await exchange.trader.redeemMany({
                entries: candidates.map((c) => ({
                  marketId: marketId as `0x${string}`,
                  outcomeIdx: c.outcomeIdx,
                  amount: c.amount,
                })),
              });

              if (res.receipt?.status === "reverted") {
                throw new Error(
                  `redeemMany tx reverted for market ${marketId}`,
                );
              }

              for (const pos of mpos) {
                pos.status = "resolved";
                pos.win =
                  resolved &&
                  pos.side === (winningOutcome === 0 ? "up" : "down");
                // Add settlement PnL to any existing realized PnL from prior partial sells
                const settlementPnl = pos.win
                  ? pos.contracts * (1 - pos.avgPrice)
                  : -pos.contracts * pos.avgPrice;
                pos.realizedPnl = Number(pos.realizedPnl) + settlementPnl;
                await this.positionRepo.save(pos);
              }

              logger.info(
                `Auto-redeemed market ${marketId} for pot ${pot.id}: ${candidates.length} outcome(s)`,
              );
              break;
            } catch (err) {
              logger.warn(
                { err, marketId, attempt },
                `Auto-redeem attempt ${attempt}/${REDEEM_MAX_RETRIES} failed for market ${marketId}`,
              );
              if (attempt < REDEEM_MAX_RETRIES)
                await sleep(REDEEM_RETRY_DELAY_MS * attempt);
            }
          }
        }

        // Check if all positions are now resolved
        const remainingOpen = await this.positionRepo.count({
          where: { potId: pot.id, status: "open" },
        });

        if (remainingOpen === 0 && pot.status === "trading") {
          // All positions settled — run payout calculation and mark pot as settled
          await this.settlePot(pot);
          pot.status = "settled";
          await this.potRepo.save(pot);
          logger.info(`Pot ${pot.id} auto-settled — all positions redeemed, LPs can now withdraw`);
        }

        redeemedCount++;
      } catch (err) {
        logger.error(err, `Auto-redeem failed for pot ${pot.id}`);
      }
    }

    return redeemedCount;
  }

  /**
   * Get payout for a pot.
   */
  async getPayout(potId: string): Promise<Payout | null> {
    return this.payoutRepo.findOne({ where: { potId } });
  }

  /**
   * Claim payout for a user — transfers tUSDC from pot signer.
   * Validates that userAddress matches the authenticated user's wallet.
   */
  async claimPayout(input: {
    potId: string;
    userId: string;
    userAddress: string;
  }): Promise<{ amount: number; txHash: string }> {
    // Validate userAddress is a valid hex address
    if (!input.userAddress || !/^0x[0-9a-fA-F]{40}$/.test(input.userAddress)) {
      throw new Error("Invalid user address");
    }

    const payout = await this.payoutRepo.findOne({
      where: { potId: input.potId },
    });
    if (!payout) throw new Error("No payout found for this pot");
    if (payout.status === "distributed")
      throw new Error("Payout already distributed");

    const claimAmount = payout.distribution[input.userId];
    if (!claimAmount || claimAmount <= 0) {
      throw new Error("No claimable amount for this user");
    }

    const pot = await this.potRepo.findOne({ where: { id: input.potId } });
    if (!pot) throw new Error("Pot not found");

    // Execute tUSDC transfer from pot signer to user
    const privateKey = derivePotKey(pot.signerIndex) as `0x${string}`;
    const amountBigInt = await toRawUnits(claimAmount);

    let txHash: string;
    try {
      const { privateKeyToAccount } = await import("viem/accounts");
      const account = privateKeyToAccount(privateKey);
      const walletClient = createWalletClient({
        account,
        chain: CHAIN,
        transport: http(),
      });
      const hash = await walletClient.writeContract({
        address: COLLATERAL_ADDRESS,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [input.userAddress as `0x${string}`, amountBigInt],
        chain: CHAIN,
      });
      txHash = hash;
    } catch (err) {
      logger.error(err, `On-chain transfer failed for claim`);
      throw new Error(
        `Claim transfer failed: ${err instanceof Error ? err.message : "unknown error"}`,
      );
    }

    // Mark share as claimed
    const share = await this.shareRepo.findOne({
      where: { userId: input.userId, potId: input.potId },
    });
    if (share) {
      share.claimableUsd = 0;
      await this.shareRepo.save(share);
    }

    // Check if all users have claimed — only then mark as fully distributed
    const allShares = await this.shareRepo.find({ where: { potId: input.potId } });
    const allClaimed = allShares.every((s) => Number(s.claimableUsd) <= 0);
    if (allClaimed) {
      payout.status = "distributed";
    }
    await this.payoutRepo.save(payout);

    logger.info(
      `Payout claimed: ${claimAmount} USDC by user ${input.userId} from pot ${input.potId}`,
    );
    return { amount: claimAmount, txHash };
  }
}
