import { type DataSource } from "typeorm";
import { v4 as uuid } from "uuid";
import { createPublicClient, createWalletClient, http, formatUnits } from "viem";
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
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "transfer", type: "function", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
] as const;

// Collateral is tUSDC on testnet (6 decimals). Always derive the scale from the
// token's own decimals() rather than a literal — mainnet USDso is 18 decimals and
// the two differ by a factor of 10^12.
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
    cachedDecimals = 6; // tUSDC default on testnet
  }
  return cachedDecimals;
}

/** Convert a human-amount to the collateral's raw base units. */
async function toRawUnits(humanAmount: number): Promise<bigint> {
  const decimals = await getCollateralDecimals();
  return BigInt(Math.round(humanAmount * 10 ** decimals));
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
   * 1. Redeem winning positions
   * 2. Compute NAV
   * 3. Calculate payout waterfall
   * 4. Credit share holders
   */
  async settleEpoch(epochId: string): Promise<void> {
    const pots = await this.potRepo.find({ where: { epochId } });
    const epoch = await this.epochRepo.findOne({ where: { id: epochId } });
    if (!epoch) throw new Error("Epoch not found");

    logger.info(`Starting settlement for epoch ${epoch.number} (${pots.length} pots)`);

    for (const pot of pots) {
      try {
        await this.settlePot(pot);
      } catch (err) {
        logger.error(err, `Failed to settle pot ${pot.id}`);
      }
    }

    // Mark epoch as settled
    epoch.status = "settled";
    await this.epochRepo.save(epoch);

    logger.info(`Epoch ${epoch.number} settled`);
  }

  /**
   * Settle a single pot — redeem positions, compute NAV, distribute payouts.
   */
  async settlePot(pot: Pot): Promise<Payout | null> {
    if (pot.status !== "settling") {
      logger.warn(`Pot ${pot.id} not in settling status`);
      return null;
    }

    // 1. Redeem winning positions via DreamDEX
    await this.redeemPositions(pot);

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
      logger.warn(err, `On-chain balance read failed for pot ${pot.id}, falling back to tracked NAV`);
      finalNav = pot.nav;
    }

    // 3. Compute per-share value
    const totalShares = pot.sharesOutstanding;
    if (totalShares <= 0) {
      logger.warn(`Pot ${pot.id} has no shares`);
      pot.status = "settled";
      await this.potRepo.save(pot);
      return null;
    }

    const perShare = finalNav / totalShares;
    const investedPerShare = 1.0; // 1:1 at deposit

    // 4. Calculate waterfall
    let traderCutUsd = 0;
    let protocolCutUsd = 0;
    let lpDistributedUsd = 0;

    if (perShare > investedPerShare) {
      // Profit case: trader gets a cut of gains only
      const totalGain = (perShare - investedPerShare) * totalShares;
      traderCutUsd = totalGain * CALC_FEE_SPLIT.trader;
      protocolCutUsd = totalGain * CALC_FEE_SPLIT.protocol;
      lpDistributedUsd = totalGain * CALC_FEE_SPLIT.lp;
    } else {
      // Loss case: trader gets nothing, LPs split remainder pro-rata
      traderCutUsd = 0;
      protocolCutUsd = 0;
      lpDistributedUsd = 0;
    }

    // 5. Record payout
    const distribution: Record<string, number> = {};
    const shares = await this.shareRepo.find({ where: { potId: pot.id } });
    for (const share of shares) {
      const userPayout = share.shares * perShare;
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
    pot.status = "settled";
    await this.potRepo.save(pot);

    logger.info(`Pot ${pot.id} settled: perShare=${perShare.toFixed(4)}, traderCut=${traderCutUsd}`);
    return payout;
  }

  /**
   * Redeem all winning positions for a pot.
   * Resolved → redeem the winning outcome. Voided → redeem BOTH sides (0.5 each).
   * Redemption is batched into `redeemMany` calls.
   */
  private async redeemPositions(pot: Pot): Promise<void> {
    try {
      const privateKey = derivePotKey(pot.signerIndex) as `0x${string}`;
      const exchange = createTradingExchange(privateKey);
      await exchange.loadMarkets(true);

      const positions = await this.positionRepo.find({
        where: { potId: pot.id, status: "open" },
      });

      // Dedupe positions by marketId (a pot may hold both up & down on one market)
      const markets = new Map<string, { pos: Position[]; resolved: boolean; voided: boolean; winningOutcome: number }>();
      for (const pos of positions) {
        const key = pos.marketId;
        const onchain = await exchange.client.getMarketOnchain(pos.marketId as `0x${string}`);
        const isFinal = onchain.isResolved || onchain.isVoided;
        if (!isFinal) continue;

        let entry = markets.get(key);
        if (!entry) {
          entry = {
            pos: [],
            resolved: onchain.isResolved,
            voided: onchain.isVoided,
            winningOutcome: Number(onchain.winningOutcome),
          };
          markets.set(key, entry);
        }
        entry.pos.push(pos);
      }

      for (const [marketId, { pos: mpos, resolved, voided, winningOutcome }] of markets) {
        try {
          const onchain = await exchange.client.getMarketOnchain(marketId as `0x${string}`);

          // Determine which outcome ids to attempt redemption for.
          const candidates: Array<{ outcomeIdx: 0 | 1; amount: bigint }> = [];
          for (const outcomeIdx of [0, 1] as const) {
            if (resolved && outcomeIdx !== (winningOutcome as 0 | 1)) continue; // losers pay 0 — skip
            const held = await exchange.client.getOutcomeBalance({
              outcomeToken: onchain.outcomeToken,
              account: pot.signerAddress as `0x${string}`,
              id: outcomeIdx === 0 ? onchain.yesId : onchain.noId,
            });
            if (held > 0n) candidates.push({ outcomeIdx, amount: held });
          }

          if (candidates.length === 0) {
            // Nothing redeemable — mark positions resolved (losses pay 0, no revert).
            for (const pos of mpos) {
              pos.status = "resolved";
              pos.win = resolved && pos.side === (winningOutcome === 0 ? "up" : "down");
              pos.realizedPnl = pos.win
                ? pos.contracts * (1 - pos.avgPrice)
                : -pos.contracts * pos.avgPrice;
              await this.positionRepo.save(pos);
            }
            continue;
          }

          const res = await exchange.trader.redeemMany({
            entries: candidates.map((c) => ({
              marketId: marketId as `0x${string}`,
              outcomeIdx: c.outcomeIdx,
              amount: c.amount,
            })),
          });

          if (res.receipt?.status === "reverted") {
            logger.warn(`redeemMany reverted for market ${marketId}`);
            continue;
          }

          for (const pos of mpos) {
            pos.status = "resolved";
            pos.win = resolved && pos.side === (winningOutcome === 0 ? "up" : "down");
            pos.realizedPnl = pos.win
              ? pos.contracts * (1 - pos.avgPrice)
              : -pos.contracts * pos.avgPrice;
            await this.positionRepo.save(pos);
          }

          logger.info(
            `Redeemed market ${marketId}: ${candidates.length} outcome(s), ` +
            `${voided ? "voided (0.5/side)" : resolved ? `winner=${winningOutcome}` : "pending"}`,
          );
        } catch (err) {
          logger.error(err, `Failed to redeem market ${marketId}`);
        }
      }
    } catch (err) {
      logger.error(err, `Failed to redeem positions for pot ${pot.id}`);
    }
  }

  /**
   * Get payout for a pot.
   */
  async getPayout(potId: string): Promise<Payout | null> {
    return this.payoutRepo.findOne({ where: { potId } });
  }

  /**
   * Claim payout for a user — transfers tUSDC from pot signer.
   */
  async claimPayout(input: {
    potId: string;
    userId: string;
    userAddress: string;
  }): Promise<{ amount: number; txHash: string }> {
    const payout = await this.payoutRepo.findOne({ where: { potId: input.potId } });
    if (!payout) throw new Error("No payout found for this pot");
    if (payout.status === "distributed") throw new Error("Payout already distributed");

    const claimAmount = payout.distribution[input.userId];
    if (!claimAmount || claimAmount <= 0) {
      throw new Error("No claimable amount for this user");
    }

    const pot = await this.potRepo.findOne({ where: { id: input.potId } });
    if (!pot) throw new Error("Pot not found");

    // Execute tUSDC transfer from pot signer to user
    const privateKey = derivePotKey(pot.signerIndex) as `0x${string}`;
    const client = createPublicClient({ chain: CHAIN, transport: http() });
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
      throw new Error(`Claim transfer failed: ${err instanceof Error ? err.message : "unknown error"}`);
    }

    // Mark share as claimed
    const share = await this.shareRepo.findOne({
      where: { userId: input.userId, potId: input.potId },
    });
    if (share) {
      share.claimableUsd = 0;
      await this.shareRepo.save(share);
    }

    payout.status = "distributed";
    await this.payoutRepo.save(payout);

    logger.info(`Payout claimed: ${claimAmount} USDC by user ${input.userId} from pot ${input.potId}`);
    return { amount: claimAmount, txHash };
  }
}
