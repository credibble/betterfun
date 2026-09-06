import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { Wallet, TrendingUp, Lock, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { B3TR } from "@/components/Token";
import {
  ActionPairTabs,
} from "@/components/ActionPairTabs";
import {
  useDeposit,
  useWithdraw,
  usePots,
  usePotShares,
  useMe,
  usePayout,
  useClaimPayout,
  usePot,
  useEpoch,
} from "@/lib/queries";
import { TUSDC_TOKEN, TUSDC_ABI } from "@/lib/chains";
import { copyToClipboard } from "@/lib/clipboard";
import { StrategyInfoNote } from "@/components/traders/StrategyInfoNote";

type Trader = { id: string; name: string };

function formatUsd(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function potPhase(epochStatus?: string): string {
  switch (epochStatus) {
    case "upcoming": return "Funding open";
    case "live": return "Live";
    case "settling": return "Settling";
    case "settled": return "Settled";
    default: return epochStatus ?? "";
  }
}

const quick = [50, 100, 500];

export function StakePanel({
  trader,
  preferredEpochId,
  pot: potProp,
}: {
  trader: Trader;
  preferredEpochId?: string;
  pot?: any;
}) {
  const { address } = useAccount();
  const { data: pots } = usePots();

  // Prefer the trader's funding pot (upcoming epoch — the one followers can stake
  // into), falling back to their most recent pot in the current window.
  const potList = Array.isArray(pots) ? pots : [];
  const potId =
    potProp?.id ??
    potList.find((p) => p.traderId === trader.id)?.id;
  const { data: potData } = usePot(potId ?? "");
  const pot = potProp ?? potData;

  const { data: me } = useMe();
  const { data: shares } = usePotShares(pot?.id);
  const { data: payout } = usePayout(pot?.id ?? "");
  const { data: epoch } = useEpoch(preferredEpochId ?? pot?.epochId ?? "");

  const myShare = shares?.find((s) => me?.id && s.userId === me.id);
  const staked = myShare?.investedUsd ?? 0;
  const claimable = myShare?.claimableUsd ?? 0;

  const [amount, setAmount] = useState(0);
  const [mode, setMode] = useState<"stake" | "unstake" | "claim">("stake");
  const [copied, setCopied] = useState(false);

  const depositMutation = useDeposit();
  const withdrawMutation = useWithdraw();
  const claimMutation = useClaimPayout();

  // Refs capture latest values without triggering effect churn.
  const potRef = useRef(pot);
  potRef.current = pot;
  const amountRef = useRef(amount);
  amountRef.current = amount;
  const traderNameRef = useRef(trader.name);
  traderNameRef.current = trader.name;
  const submittedRef = useRef<string | null>(null);

  const { writeContractAsync } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);

  const submitDeposit = (hash: `0x${string}`) => {
    // Fire exactly once per transfer hash — never on re-renders.
    if (submittedRef.current === hash) return;
    const p = potRef.current;
    const amt = amountRef.current;
    if (!p) return;
    submittedRef.current = hash;

    depositMutation.mutate(
      { potId: p.id, amountUsd: amt, txHash: hash },
      {
        onSuccess: (res) => {
          toast.success(`Deposited ${formatUsd(res.investedUsd ?? amt)} into ${traderNameRef.current}'s pot`, {
            description: "Shares minted 1:1 at current NAV.",
          });
          setAmount(0);
          setTxHash(undefined);
        },
        onError: (err: any) => {
          toast.error(err?.message ?? "Deposit failed");
          setTxHash(undefined);
        },
      },
    );
  };

  // Submit once the tUSDC transfer is confirmed (guarded so it fires once per hash).
  const { data: txReceipt, isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  useEffect(() => {
    if (txSuccess && txReceipt && txHash) {
      submitDeposit(txHash);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txSuccess, txReceipt, txHash]);

  const onMint = async () => {
    if (!address) {
      toast.error("Connect a wallet first");
      return;
    }
    try {
      const hash = await writeContractAsync({
        address: TUSDC_TOKEN.address,
        abi: TUSDC_ABI,
        functionName: "faucet",
        args: [parseUnits("1000", 6)],
        chainId: TUSDC_TOKEN.chainId,
      });
      toast.success("Minting 1,000 test tUSDC…", { description: hash.slice(0, 10) });
    } catch (err: any) {
      toast.error(err?.message ?? "Mint failed");
    }
  };

  const onStake = async () => {
    if (!address) {
      toast.error("Connect a wallet first");
      return;
    }
    if (amount <= 0) {
      toast.error("Enter an amount to stake");
      return;
    }
    if (!pot) {
      toast.error("No pot available yet");
      return;
    }
    if (epoch?.status !== "upcoming") {
      toast.error("Staking closed", { description: `${potPhase(epoch?.status)} — stake only while funding is open.` });
      return;
    }
    try {
      const hash = await writeContractAsync({
        address: TUSDC_TOKEN.address,
        abi: TUSDC_ABI,
        functionName: "transfer",
        args: [pot.signerAddress as `0x${string}`, parseUnits(String(amount), 6)],
        chainId: TUSDC_TOKEN.chainId,
      });
      setTxHash(hash);
      toast.success("Transfer sent — confirming on chain…", { description: hash.slice(0, 10) });
    } catch (err: any) {
      toast.error(err?.message ?? "Transfer failed");
    }
  };

  const onWithdraw = () => {
    if (!pot) {
      toast.error("No pot available");
      return;
    }
    if (epoch?.status !== "upcoming") {
      toast.error("Withdraw closed", { description: "You can only withdraw before the epoch locks." });
      return;
    }
    if (staked <= 0) {
      toast.error("Nothing staked yet");
      return;
    }
    const amt = amount > 0 ? Math.min(amount, staked) : staked;
    withdrawMutation.mutate(
      { potId: pot.id, amountUsd: amt },
      {
        onSuccess: () => {
          toast.success(`Withdrew ${formatUsd(amt)} from ${trader.name}'s pot`);
          setAmount(0);
        },
        onError: (err: any) => {
          toast.error(err?.message ?? "Withdraw failed");
        },
      },
    );
  };

  const onClaim = () => {
    if (!pot) {
      toast.error("No pot available");
      return;
    }
    if (epoch?.status !== "settled") {
      toast.error("Pot not settled yet");
      return;
    }
    if (claimable <= 0) {
      toast.error("Nothing to claim");
      return;
    }
    const userAddress = (me?.walletAddress ?? address) as `0x${string}`;
    claimMutation.mutate(
      { potId: pot.id, userAddress },
      {
        onSuccess: () => toast.success(`Claimed ${formatUsd(claimable)}`),
        onError: (err: any) => toast.error(err?.message ?? "Claim failed"),
      },
    );
  };

  const copySigner = () => {
    if (!pot?.signerAddress) return;
    copyToClipboard(pot.signerAddress).then((ok) => {
      setCopied(ok);
      if (ok) {
        toast.success("Pot signer address copied");
        setTimeout(() => setCopied(false), 1500);
      } else {
        toast.error("Could not copy — select the text and press Ctrl+C");
      }
    });
  };

  const tabs =
    epoch?.status === "settled"
      ? ([{ value: "claim" as const, label: "Claim" }]) 
      : ([
          { value: "stake" as const, label: "Stake" },
          { value: "unstake" as const, label: "Withdraw" },
        ]);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          Pot funding
        </span>
        <span className="flex items-center gap-1 rounded-md bg-secondary/60 px-2 py-1 text-xs text-muted-foreground">
          <Wallet className="h-3.5 w-3.5" />
          {address ? address.slice(0, 6) + "…" + address.slice(-4) : "no wallet"}
        </span>
      </div>

      {pot ? (
        <div className="mb-4 space-y-3">
          <div className="rounded-lg border border-border bg-secondary/20 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">{potPhase(epoch?.status)}</span>
              <span className="rounded-md bg-primary/15 px-1.5 py-0.5 font-bold text-primary">
                NAV {formatUsd(pot.nav)}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-muted-foreground">
              <span>
                LP price{" "}
                <span className="num font-semibold text-foreground">
                  ${Number(pot.lpPrice).toFixed(3)}
                </span>
              </span>
              <span>
                At work{" "}
                <span className="font-semibold text-foreground">
                  {pot.nav > 0 ? `${Math.round((pot.deployed / pot.nav) * 100)}%` : "—"}
                </span>
              </span>
              <span className="col-span-2 truncate">
                Signer{" "}
                <button
                  type="button"
                  onClick={copySigner}
                  className="inline-flex items-center gap-1 font-semibold text-link hover:underline"
                >
                  {pot.signerAddress.slice(0, 6)}…{pot.signerAddress.slice(-4)}
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </button>
              </span>
            </div>
            <Link
              to="/pots/$id"
              params={{ id: pot.id }}
              className="mt-2 inline-block font-semibold text-link hover:underline"
            >
              View pot detail
            </Link>
          </div>
          <StrategyInfoNote strategy={pot.strategy} compact />
        </div>
      ) : (
        <div className="mb-4 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
          No pot for this trader yet.
        </div>
      )}

      {staked > 0 && (
        <div className="mb-4 rounded-lg border border-up/30 bg-up/10 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Your stake</span>
            <span className="text-sm font-bold text-foreground">{formatUsd(staked)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-up" /> Claimable
            </span>
            <span className="text-sm font-semibold text-up">{formatUsd(claimable)}</span>
          </div>
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onMint}
          className="rounded-md bg-secondary/70 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
        >
          Mint 1,000 test tUSDC
        </button>
      </div>

      <ActionPairTabs className="mb-4" value={mode} onChange={setMode} options={tabs} />

      {pot && epoch?.status !== "upcoming" && mode !== "claim" && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-[11px] text-foreground">
          <Lock className="mt-0.5 h-3.5 shrink-0 text-warn" />
          <p>
            {potPhase(epoch?.status)} — stakes are locked until the pot settles.{" "}
            <Link to="/epochs" className="font-semibold text-link hover:underline">
              View epochs
            </Link>
          </p>
        </div>
      )}

      {mode !== "claim" && (
        <>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Amount (tUSDC)</span>
            <span className="num text-sm text-foreground">{formatUsd(amount)}</span>
          </div>

          <div className="mb-4 grid grid-cols-4 gap-2">
            {quick.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount((a) => a + v)}
                className="rounded-md bg-secondary/70 py-2 text-xs font-medium text-foreground hover:bg-secondary"
              >
                +{v}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAmount(mode === "stake" ? (pot?.nav ?? 0) : staked)}
              className="rounded-md bg-secondary/70 py-2 text-xs font-medium text-foreground hover:bg-secondary"
            >
              Max
            </button>
          </div>
        </>
      )}

      {mode === "stake" && (
        <button
          type="button"
          onClick={onStake}
          disabled={depositMutation.isPending || !!txHash}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-up py-3 text-sm font-semibold text-up-foreground shadow-block-up transition-all duration-150 hover:brightness-110 active:translate-y-[3px] active:shadow-none disabled:opacity-50"
        >
          {txHash ? "Confirming transfer…" : depositMutation.isPending ? "Depositing…" : <>Stake {amount > 0 ? `$${amount.toLocaleString()}` : ""}</>}
        </button>
      )}
      {mode === "unstake" && (
        <button
          type="button"
          onClick={onWithdraw}
          disabled={withdrawMutation.isPending}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-down py-3 text-sm font-semibold text-down-foreground shadow-block-down transition-all duration-150 hover:brightness-110 active:translate-y-[3px] active:shadow-none disabled:opacity-50"
        >
          {withdrawMutation.isPending ? "Withdrawing…" : "Withdraw before lock"}
        </button>
      )}
      {mode === "claim" && (
        <button
          type="button"
          onClick={onClaim}
          disabled={claimMutation.isPending || claimable <= 0}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-up py-3 text-sm font-semibold text-up-foreground shadow-block-up transition-all duration-150 hover:brightness-110 active:translate-y-[3px] active:shadow-none disabled:opacity-50"
        >
          {claimMutation.isPending ? "Claiming…" : claimable > 0 ? `Claim ${formatUsd(claimable)}` : "Nothing to claim"}
        </button>
      )}

      {payout && mode === "claim" && (
        <div className="mt-3 space-y-1 rounded-lg border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
          <p className="flex justify-between">
            <span>Per-share value</span>
            <span className="num font-semibold text-foreground">${Number(payout.perShare).toFixed(4)}</span>
          </p>
          <p className="flex justify-between">
            <span>Trader cut</span>
            <span className="num font-semibold text-foreground">{formatUsd(payout.traderCutUsd)}</span>
          </p>
          <p className="flex justify-between">
            <span>LP distributed</span>
            <span className="num font-semibold text-foreground">{formatUsd(payout.lpDistributedUsd)}</span>
          </p>
        </div>
      )}

      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        Capital is at risk. Profits split 80% LP / 15% trader / 5% protocol — on gains only.
      </p>
    </div>
  );
}