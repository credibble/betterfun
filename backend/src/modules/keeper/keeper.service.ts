import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { somniaTestnet } from "viem/chains";
import { logger } from "../../lib/logger.js";
import { EpochControllerAbi } from "./epoch-abi.js";

const EpochStatus = { Upcoming: 0, Live: 1, Settling: 2, Settled: 3 } as const;

let intervalHandle: ReturnType<typeof setInterval> | null = null;

let publicClient: PublicClient;
let walletClient: WalletClient;
let keeperAddress: Address;
let epochAddress: Address;

export function startKeeper(config: {
  rpcUrl: string;
  keeperPrivateKey: `0x${string}`;
  epochControllerAddress: `0x${string}`;
  pollIntervalMs?: number;
}) {
  const { rpcUrl, keeperPrivateKey, epochControllerAddress, pollIntervalMs = 30_000 } = config;

  const account = privateKeyToAccount(keeperPrivateKey);
  keeperAddress = account.address;
  epochAddress = epochControllerAddress;

  publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: http(rpcUrl),
  });

  walletClient = createWalletClient({
    account,
    chain: somniaTestnet,
    transport: http(rpcUrl),
  });

  logger.info({ address: keeperAddress, pollIntervalMs }, "Keeper started");

  // Run immediately, then on interval
  tick().catch((err) => logger.error(err, "Keeper tick error"));
  intervalHandle = setInterval(() => {
    tick().catch((err) => logger.error(err, "Keeper tick error"));
  }, pollIntervalMs);
}

export function stopKeeper() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info("Keeper stopped");
  }
}

async function tick() {
  const count = await publicClient.readContract({
    address: epochAddress,
    abi: EpochControllerAbi,
    functionName: "epochCount",
  });

  // No epochs yet — create the first one
  if (count === 0n) {
    logger.info("No epochs exist — creating epoch 0");
    await createEpoch(0n);
    return;
  }

  // Check latest epoch and any pending transitions
  for (let i = 0n; i < count; i++) {
    const ep = await publicClient.readContract({
      address: epochAddress,
      abi: EpochControllerAbi,
      functionName: "getEpoch",
      args: [i],
    });

    const now = BigInt(Math.floor(Date.now() / 1000));

    if (ep.status === EpochStatus.Upcoming && now >= ep.startsAt) {
      await transition("goLive", i);
    } else if (ep.status === EpochStatus.Live && now >= ep.tradingEndsAt) {
      await transition("goSettling", i);
    } else if (ep.status === EpochStatus.Settling && now >= ep.endsAt) {
      await transition("goSettled", i);
    }
  }

  // After settling, create next epoch if the latest one is Settled
  const latest = await publicClient.readContract({
    address: epochAddress,
    abi: EpochControllerAbi,
    functionName: "getEpoch",
    args: [count - 1n],
  });

  if (latest.status === EpochStatus.Settled) {
    await createEpoch(0n); // 0 = auto-calculate startsAt
  }
}

async function transition(
  fn: "goLive" | "goSettling" | "goSettled",
  epochId: bigint,
) {
  const label = fn.replace("go", "");
  logger.info({ epoch: Number(epochId), to: label }, `Epoch ${Number(epochId)} → ${label}`);

  try {
    const { request } = await publicClient.simulateContract({
      address: epochAddress,
      abi: EpochControllerAbi,
      functionName: fn,
      args: [epochId],
      account: keeperAddress,
    });

    // Pass local account so viem signs and sends eth_sendRawTransaction
    // (Somnia RPC does not support eth_sendTransaction)
    const hash = await walletClient.writeContract({
      ...request,
      account: walletClient.account!,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    logger.info(
      { epoch: Number(epochId), to: label, tx: hash, status: receipt.status },
      `Epoch ${Number(epochId)} → ${label} confirmed`,
    );
  } catch (err: unknown) {
    // Already transitioned (revert) — ignore
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("EpochNot") || msg.includes("Already")) {
      logger.debug({ epoch: Number(epochId), to: label }, `Epoch ${Number(epochId)} already ${label}`);
    } else {
      logger.error({ epoch: Number(epochId), to: label, err: msg }, `Failed transition ${fn}`);
    }
  }
}

async function createEpoch(startsAt: bigint) {
  logger.info("Creating new epoch");

  try {
    const { request } = await publicClient.simulateContract({
      address: epochAddress,
      abi: EpochControllerAbi,
      functionName: "createEpoch",
      args: [startsAt],
      account: keeperAddress,
    });

    const hash = await walletClient.writeContract({
      ...request,
      account: walletClient.account!,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    logger.info({ tx: hash, status: receipt.status }, "New epoch created");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err: msg }, "Failed to create epoch");
  }
}
