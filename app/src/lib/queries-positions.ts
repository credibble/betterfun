import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { PotVaultAbi, parseUsdc, formatUsdc } from "./contracts";
import { useSubgraphTrades } from "./subgraph-queries";
import type { PositionView, TradeView, PayoutView } from "./types";
import { useMemo } from "react";

export function usePositions(potId: string) {
  const { data: trades = [], isLoading } = useSubgraphTrades(potId);

  const data = useMemo(() => {
    const positions: Record<string, PositionView> = {};

    for (const t of trades) {
      const key = t.pool;
      if (!positions[key]) {
        positions[key] = {
          id: key,
          potId,
          marketId: t.pool,
          side: t.side.includes("YES") ? "up" : "down",
          contracts: 0,
          avgPrice: 0,
          realizedPnl: 0,
          win: false,
        };
      }
      const p = positions[key];
      const size = Number(t.size) / 1e6;
      const price = Number(t.tick) / 1e6;
      if (t.side === "BUY_YES" || t.side === "BUY_NO") {
        p.avgPrice =
          p.contracts > 0
            ? (p.avgPrice * p.contracts + price * size) / (p.contracts + size)
            : price;
        p.contracts += size;
      } else {
        p.contracts -= size;
        p.realizedPnl += size * (price - p.avgPrice);
      }
    }

    return Object.values(positions).filter((p) => p.contracts > 0.0001);
  }, [trades, potId]);

  return { data, isLoading };
}

export function useTrades(potId: string) {
  const { data: sgTrades = [], isLoading, error } = useSubgraphTrades(potId);
  const data = useMemo(
    () =>
      sgTrades.map((t): TradeView => ({
        id: t.id,
        potId: t.pot,
        marketId: t.pool,
        side: t.side,
        size: Number(t.size) / 1e6,
        price: Number(t.tick) / 1e6,
        orderId: t.orderId,
        timestamp: Number(t.timestamp) * 1000,
      })),
    [sgTrades],
  );
  return { data, isLoading, error };
}

/**
 * Place a trade directly on the PotVault contract.
 * Translates UI-friendly params into raw contract args.
 */
export function useTrade(vaultAddress?: `0x${string}`) {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const qc = useQueryClient();

  const trade = async (input: {
    pool: `0x${string}`;
    side: "buy_up" | "buy_down" | "sell_up" | "sell_down";
    sizeUsd: number;
    maxPrice?: number;
    expiryNs?: bigint;
  }) => {
    const sideMap: Record<string, 0 | 1 | 2 | 3> = {
      buy_up: 0,   // BUY_YES
      sell_up: 1,  // SELL_YES
      buy_down: 2, // BUY_NO
      sell_down: 3, // SELL_NO
    };
    const side = sideMap[input.side];
    const isSell = input.side.startsWith("sell");
    const tick = input.maxPrice != null ? parseUsdc(input.maxPrice) : parseUsdc(0.5);
    const size = parseUsdc(input.sizeUsd);
    const expiryNs = input.expiryNs ?? BigInt(Date.now()) * 1_000_000n + BigInt(3600 * 1_000_000_000);
    const orderKind = 0; // GTC
    const selfMatch = 0; // reject

    const addr = vaultAddress ?? "0x1d04C7a884544c28f224617A9De7F8f6107a68d0" as `0x${string}`;

    const orderId = await writeContractAsync({
      address: addr,
      abi: PotVaultAbi,
      functionName: "trade",
      args: [input.pool, side, tick, size, expiryNs, orderKind, selfMatch],
    });

    return orderId;
  };

  const mutate = (
    input: {
      pool: `0x${string}`;
      side: "buy_up" | "buy_down" | "sell_up" | "sell_down";
      sizeUsd: number;
      maxPrice?: number;
      expiryNs?: bigint;
    },
    options?: { onSuccess?: () => void; onError?: (err: Error) => void },
  ) => {
    trade(input)
      .then(() => {
        qc.invalidateQueries({ queryKey: ["subgraph", "trades"] });
        qc.invalidateQueries({ queryKey: ["subgraph", "pots"] });
        options?.onSuccess?.();
      })
      .catch((err: Error) => {
        options?.onError?.(err);
      });
  };

  return { mutate, trade, hash, isPending, receipt, error };
}

/**
 * Read payout info from the PotVault contract directly.
 * Returns positionTotals (yes/no) and nav for computing payout state.
 */
export function usePayout(vaultAddress: string | undefined) {
  const { data: positionTotals, isLoading: ptLoading } = useReadContract({
    address: vaultAddress as `0x${string}` | undefined,
    abi: PotVaultAbi,
    functionName: "positionTotals",
    query: { enabled: !!vaultAddress },
  });

  const { data: nav, isLoading: navLoading } = useReadContract({
    address: vaultAddress as `0x${string}` | undefined,
    abi: PotVaultAbi,
    functionName: "nav",
    query: { enabled: !!vaultAddress },
  });

  const { data: totalSupply, isLoading: tsLoading } = useReadContract({
    address: vaultAddress as `0x${string}` | undefined,
    abi: PotVaultAbi,
    functionName: "totalSupply",
    query: { enabled: !!vaultAddress },
  });

  const data: PayoutView | undefined = positionTotals && nav != null && totalSupply != null
    ? {
        potId: vaultAddress ?? "",
        epochId: "",
        totalYes: Number((positionTotals as readonly [bigint, bigint])[0]) / 1e6,
        totalNo: Number((positionTotals as readonly [bigint, bigint])[1]) / 1e6,
        nav: Number(nav) / 1e6,
        totalShares: Number(totalSupply),
        sharePrice: Number(totalSupply) > 0 ? Number(nav) / Number(totalSupply) : 1,
        status: "pending",
      }
    : undefined;

  return { data, isLoading: ptLoading || navLoading || tsLoading };
}

/**
 * Redeem outcome tokens for collateral directly on the PotVault contract.
 */
export function useClaimPayout(vaultAddress?: `0x${string}`) {
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const qc = useQueryClient();
  const addr = vaultAddress ?? "0x1d04C7a884544c28f224617A9De7F8f6107a68d0" as `0x${string}`;

  const claim = async (input: { outcomeId: bigint; amount: bigint }) => {
    const collateralOut = await writeContractAsync({
      address: addr,
      abi: PotVaultAbi,
      functionName: "redeem",
      args: [input.outcomeId, input.amount],
    });
    return collateralOut;
  };

  const mutate = (input: { outcomeId: bigint; amount: bigint }) => {
    claim(input).then(() => {
      qc.invalidateQueries({ queryKey: ["subgraph", "pots"] });
    });
  };

  return { mutate, claim, hash, isPending, receipt, error };
}
