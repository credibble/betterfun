import { type Hex } from "viem";
import {
  readVaultState,
  readOutcomeBalance,
  vaultRedeem,
} from "./vault.service.js";
import { getReadExchange } from "../dreamdex/exchange.js";
import { isBinaryMarket } from "@somnia-chain/markets-sdk";
import { logger } from "../../lib/logger.js";

/**
 * Vault settlement keeper.
 * Scans for settled markets where the vault holds outcome tokens,
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

        const yesId = onchain.yesId;
        const noId = onchain.noId;

        // Read the vault's actual balance for this specific outcome token
        if (yesId) {
          const yesBalance = await readOutcomeBalance(vault, BigInt(yesId));
          if (yesBalance > 0n) {
            try {
              const receipt = await vaultRedeem(vault, operatorKey, BigInt(yesId), yesBalance);
              logger.info(`vault keeper: redeemed YES for ${m.symbol} (${yesBalance}) tx=${receipt.transactionHash}`);
              redeemed++;
            } catch (err: any) {
              logger.debug(`vault keeper: YES redeem skipped for ${m.symbol}: ${err.message?.slice(0, 80)}`);
            }
          }
        }

        if (noId) {
          const noBalance = await readOutcomeBalance(vault, BigInt(noId));
          if (noBalance > 0n) {
            try {
              const receipt = await vaultRedeem(vault, operatorKey, BigInt(noId), noBalance);
              logger.info(`vault keeper: redeemed NO for ${m.symbol} (${noBalance}) tx=${receipt.transactionHash}`);
              redeemed++;
            } catch (err: any) {
              logger.debug(`vault keeper: NO redeem skipped for ${m.symbol}: ${err.message?.slice(0, 80)}`);
            }
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
