import { type Hex } from "viem";
import {
  readVaultState,
  readVaultPositionTotals,
  vaultRedeem,
} from "./vault.service.js";
import { getReadExchange } from "../dreamdex/exchange.js";
import { isBinaryMarket } from "@somnia-chain/markets-sdk";
import { logger } from "../../lib/logger.js";

/**
 * Vault settlement keeper.
 * Scans for settled markets where the vault holds positions,
 * then calls vault.redeem() to claim collateral.
 */
export async function redeemSettledPositions(
  vault: Hex,
  operatorKey: Hex,
) {
  try {
    const state = await readVaultState(vault);
    if (state.halted) {
      logger.info("vault keeper: vault halted, skipping");
      return;
    }

    const positions = await readVaultPositionTotals(vault);
    const totalYes = Number(positions.yes);
    const totalNo = Number(positions.no);

    if (totalYes === 0 && totalNo === 0) {
      return; // silent — no positions to redeem
    }

    // Load all markets to find settled ones
    const exchange = getReadExchange();
    const allMarkets = await exchange.loadMarkets(true);
    let redeemed = 0;

    for (const m of Object.values(allMarkets)) {
      if (!m.active || !isBinaryMarket(m.info)) continue;

      try {
        const onchain = await exchange.client.getMarketOnchain(m.info.marketId);
        // status 4 = resolved, 5 = voided
        if (onchain.status !== 4 && onchain.status !== 5) continue;

        // Check if the vault holds outcome tokens for this market
        const yesId = onchain.yesId;
        const noId = onchain.noId;

        if (yesId && positions.yes > 0n) {
          try {
            const receipt = await vaultRedeem(vault, operatorKey, yesId, positions.yes);
            logger.info(`vault keeper: redeemed YES tokens for ${m.symbol} tx=${receipt.transactionHash}`);
            redeemed++;
          } catch (err: any) {
            // May already be redeemed or no balance — skip silently
            logger.debug(`vault keeper: YES redeem skipped for ${m.symbol}: ${err.message?.slice(0, 80)}`);
          }
        }

        if (noId && positions.no > 0n) {
          try {
            const receipt = await vaultRedeem(vault, operatorKey, noId, positions.no);
            logger.info(`vault keeper: redeemed NO tokens for ${m.symbol} tx=${receipt.transactionHash}`);
            redeemed++;
          } catch (err: any) {
            logger.debug(`vault keeper: NO redeem skipped for ${m.symbol}: ${err.message?.slice(0, 80)}`);
          }
        }
      } catch {
        // Market read failed — skip
      }
    }

    if (redeemed > 0) {
      logger.info(`vault keeper: redeemed ${redeemed} positions`);
    }
  } catch (err) {
    logger.error(err, "vault keeper: redemption scan failed");
  }
}
