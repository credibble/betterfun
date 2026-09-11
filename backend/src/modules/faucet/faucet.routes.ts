import { Router } from "express";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { SOMNIA_TESTNET_ADDRESSES, SOMNIA_TESTNET_PRICE_FEED } from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { SomniaMarkets } from "@somnia-chain/markets-sdk";
import { logger } from "../../lib/logger.js";
import { env } from "../../config/env.js";

const router = Router();

const COLLATERAL = SOMNIA_TESTNET_ADDRESSES.collateral as `0x${string}`;
const ERC20_ABI = [
  { name: "transfer", type: "function", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
] as const;

router.post("/mint", async (req, res) => {
  try {
    const { address, amount } = req.body;
    if (!address || typeof address !== "string") {
      res.status(400).json({ error: "address required" });
      return;
    }
    if (!env.FAUCET_PRIVATE_KEY) {
      res.status(503).json({ error: "Faucet not configured" });
      return;
    }
    const rawAmount = typeof amount === "number" && amount > 0 ? BigInt(Math.min(amount, 10_000) * 1_000_000) : 10_000_000_000_000n;

    const exchange = new SomniaMarkets({
      indexerUrl: env.SOMNIA_INDEXER_URL,
      chain: somniaShannon,
      wsRpcUrl: env.SOMNIA_WS_RPC_URL,
      addresses: SOMNIA_TESTNET_ADDRESSES,
      priceFeed: SOMNIA_TESTNET_PRICE_FEED,
      privateKey: env.FAUCET_PRIVATE_KEY as `0x${string}`,
    });
    await exchange.loadMarkets(true);
    const mint = await exchange.trader.faucet();
    if (mint.receipt?.status === "reverted") {
      res.status(500).json({ error: "Faucet mint reverted" });
      return;
    }

    const account = privateKeyToAccount(env.FAUCET_PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: somniaShannon as any,
      transport: http(),
    });
    const tx = await walletClient.writeContract({
      address: COLLATERAL,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [address as `0x${string}`, rawAmount],
      chain: somniaShannon as any,
    });

    logger.info(`Faucet: minted tUSDC and forwarded ${rawAmount / 1_000_000n} to ${address}`);
    res.json({
      ok: true,
      txHash: tx,
      amountUsd: Number(rawAmount / 1_000_000n),
      message: `${rawAmount / 1_000_000n} tUSDC sent to ${address.slice(0, 6)}…${address.slice(-4)}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Faucet failed";
    logger.error(err, "Faucet error");
    res.status(500).json({ error: message });
  }
});

export function buildFaucetRoutes() {
  return router;
}
