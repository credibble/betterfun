import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { TrendingUp, Lock, Wallet } from "lucide-react";
import { formatUnits } from "viem";
import { ActionPairTabs } from "@/components/ActionPairTabs";
import { usePots, usePotShares, useMe, usePayout, useClaimPayout, usePot, useEpoch } from "@/lib/queries";
import { useVaultDeposit, useVaultWithdraw, useVaultShares, useVaultNav, useVaultPrice, useVaultTotalSupply, formatNav, formatSharePrice } from "@/lib/vault-hooks";
import { VAULT_ADDRESS, TUSDC_TOKEN } from "@/lib/chains";
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

  const { deposit, isPending: depositPending } = useVaultDeposit();
  const { withdraw, isPending: withdrawPending } = useVaultWithdraw();
  const claimMutation = useClaimPayout();

  // On-chain vault data
  const { data: vaultNav } = useVaultNav();
  const { data: vaultPrice } = useVaultPrice();
  const { data: myVaultShares } = useVaultShares(address);
  const { data: totalSupply } = useVaultTotalSupply();

  const vaultNavUsd = vaultNav ? Number(formatUnits(vaultNav, TUSDC_TOKEN.decimals)) : 0;
  const myVaultShareBalance = myVaultShares ? Number(formatUnits(myVaultShares, 18)) : 0;
  const myVaultValue = vaultPrice && myVaultShares
    ? Number(formatUnits(myVaultShares, 18)) * Number(formatUnits(vaultPrice, 18))
    : 0;

  const hasVault = VAULT_ADDRESS !== "0x0000000000000000000000000000000000000000";

  const onMint = async () => {
    toast.info("Use the tUSDC faucet to mint test tokens");
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
    if (!hasVault) {
      toast.error("Vault not deployed yet");
      return;
    }
    if (epoch?.status !== "upcoming") {
      toast.error("Staking closed", { description: `${potPhase(epoch?.status)} — stake only while funding is open.` });
      return;
    }
    try {
      await deposit(amount);
      toast.success(`Deposited ${formatUsd(amount)} into the vault`);
      setAmount(0);
    } catch (err: any) {
      toast.error(err?.message ?? "Deposit failed");
    }
  };

  const onWithdraw = async () => {
    if (!address) {
      toast.error("Connect a wallet first");
      return;
    }
    if (!hasVault) {
      toast.error("Vault not deployed yet");
      return;
    }
    if (myVaultShareBalance <= 0) {
      toast.error("No vault shares to withdraw");
      return;
    }
    const sharesToWithdraw = amount > 0
      ? BigInt(Math.floor(amount * 1e18))
      : myVaultShares ?? 0n;
    if (sharesToWithdraw <= 0n) {
      toast.error("Nothing to withdraw");
      return;
    }
    try {
      await withdraw(sharesToWithdraw);
      toast.success("Withdrawn from vault");
      setAmount(0);
    } catch (err: any) {
      toast.error(err?.message ?? "Withdraw failed");
    }
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

  const tabs =
    epoch?.status === "settled"
      ? ([{ value: "claim" as const, label: "Claim" }])
      : ([
          { value: "stake" as const, label: "Deposit" },
          { value: "unstake" as const, label: "Withdraw" },
        ]);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          Vault LP
        </span>
        <span className="flex items-center gap-1 rounded-md bg-secondary/60 px-2 py-1 text-xs text-muted-foreground">
          <Wallet className="h-3.5 w-3.5" />
          {address ? address.slice(0, 6) + "…" + address.slice(-4) : "no wallet"}
        </span>
      </div>

      {hasVault ? (
        <div className="mb-4 space-y-3">
          <div className="rounded-lg border border-border bg-secondary/20 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">{potPhase(epoch?.status)}</span>
              <span className="rounded-md bg-primary/15 px-1.5 py-0.5 font-bold text-primary">
                NAV {formatNav(vaultNav)}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-muted-foreground">
              <span>
                Share price{" "}
                <span className="font-semibold text-foreground">
                  {formatSharePrice(vaultPrice)}
                </span>
              </span>
              <span>
                Your shares{" "}
                <span className="font-semibold text-foreground">
                  {myVaultShareBalance > 0 ? myVaultShareBalance.toFixed(4) : "0"}
                </span>
              </span>
              <span>
                Your value{" "}
                <span className="font-semibold text-foreground">
                  {formatUsd(Math.round(myVaultValue))}
                </span>
              </span>
              <span>
                Total LP{" "}
                <span className="font-semibold text-foreground">
                  {totalSupply ? Number(formatUnits(totalSupply, 18)).toFixed(2) : "0"}
                </span>
              </span>
            </div>
            <div className="mt-2 truncate text-muted-foreground">
              Vault{" "}
              <span className="font-semibold text-link">
                {VAULT_ADDRESS.slice(0, 6)}…{VAULT_ADDRESS.slice(-4)}
              </span>
            </div>
          </div>
          {pot && <StrategyInfoNote strategy={pot.strategy} compact />}
        </div>
      ) : (
        <div className="mb-4 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
          Vault not deployed yet.
        </div>
      )}

      {myVaultShareBalance > 0 && (
        <div className="mb-4 rounded-lg border border-up/30 bg-up/10 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Your stake</span>
            <span className="text-sm font-bold text-foreground">{formatUsd(Math.round(myVaultValue))}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-up" /> LP shares
            </span>
            <span className="text-sm font-semibold text-up">{myVaultShareBalance.toFixed(4)}</span>
          </div>
        </div>
      )}

      {staked > 0 && (
        <div className="mb-4 rounded-lg border border-border bg-secondary/20 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Legacy pot stake</span>
            <span className="text-sm font-semibold text-foreground">{formatUsd(staked)}</span>
          </div>
        </div>
      )}

      <ActionPairTabs className="mb-4" value={mode} onChange={setMode} options={tabs} />

      {hasVault && epoch?.status !== "upcoming" && mode !== "claim" && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-[11px] text-foreground">
          <Lock className="mt-0.5 h-3.5 shrink-0 text-warn" />
          <p>
            {potPhase(epoch?.status)} — deposits are locked until the pot settles.{" "}
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

          <div className="mb-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2">
              <span className="text-sm text-muted-foreground">$</span>
              <input
                type="number"
                min={0}
                step={1}
                value={amount || ""}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setAmount(isNaN(v) ? 0 : Math.max(0, v));
                }}
                placeholder="0"
                className="w-full bg-transparent text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground/50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => setAmount(mode === "stake" ? vaultNavUsd : myVaultShareBalance)}
                className="shrink-0 rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary hover:bg-primary/25"
              >
                Max
              </button>
            </div>
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
          </div>
        </>
      )}

      {mode === "stake" && (
        <button
          type="button"
          onClick={onStake}
          disabled={depositPending || !hasVault}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-up py-3 text-sm font-semibold text-up-foreground shadow-block-up transition-all duration-150 hover:brightness-110 active:translate-y-[3px] active:shadow-none disabled:opacity-50"
        >
          {depositPending ? "Depositing…" : <>Deposit {amount > 0 ? `$${amount.toLocaleString()}` : ""}</>}
        </button>
      )}
      {mode === "unstake" && (
        <button
          type="button"
          onClick={onWithdraw}
          disabled={withdrawPending || !hasVault}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-down py-3 text-sm font-semibold text-down-foreground shadow-block-down transition-all duration-150 hover:brightness-110 active:translate-y-[3px] active:shadow-none disabled:opacity-50"
        >
          {withdrawPending ? "Withdrawing…" : "Withdraw from vault"}
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
