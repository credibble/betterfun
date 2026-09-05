import { useState } from "react";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, Copy, ExternalLink, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function TradingAccountPanel() {
  const { isConnected, address } = useAccount();
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [faucetLoading, setFaucetLoading] = useState(false);

  const handleFaucet = async () => {
    if (!address) return;
    setFaucetLoading(true);
    try {
      const result = await api<{ ok: boolean; message: string }>("/faucet/mint", {
        method: "POST",
        body: JSON.stringify({ address }),
      });
      toast.success(result.message ?? "10,000 tUSDC minted!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Faucet failed");
    } finally {
      setFaucetLoading(false);
    }
  };

  if (!isConnected || !address) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <Wallet className="mx-auto h-10 w-10 text-muted-foreground/50" />
        <p className="mt-3 text-sm font-semibold">No wallet connected</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Connect your wallet to manage your trading account.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-secondary/30 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Trading account</p>
            <p className="mt-1 font-mono text-sm font-semibold">{shortAddress(address)}</p>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(address);
                toast.success("Address copied");
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                window.open(
                  `https://explorer.testnet.somnia.network/address/${address}`,
                  "_blank",
                );
              }}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Faucet
        </p>
        <Button
          onClick={handleFaucet}
          disabled={faucetLoading}
          className="w-full"
          variant="outline"
        >
          {faucetLoading ? "Minting…" : "Get 10,000 tUSDC"}
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Deposit tUSDC
        </p>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Amount"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
          />
          <Button variant="outline" size="sm">
            <ArrowDownToLine className="mr-1 h-4 w-4" />
            Deposit
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Withdraw
        </p>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Amount"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
          />
          <Button variant="outline" size="sm">
            <ArrowUpFromLine className="mr-1 h-4 w-4" />
            Withdraw
          </Button>
        </div>
      </div>
    </div>
  );
}
