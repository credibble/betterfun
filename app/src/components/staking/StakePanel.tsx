import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDeposit, useWithdraw } from "@/lib/queries";
import StakeStats from "./StakeStats";

type StakePanelProps = {
  potId: string;
  nav?: number;
  lpPrice?: number;
  yourStake?: number;
  totalStakers?: number;
  className?: string;
};

export default function StakePanel({
  potId,
  nav = 0,
  lpPrice = 1,
  yourStake = 0,
  totalStakers = 0,
  className,
}: StakePanelProps) {
  const [amount, setAmount] = useState("");
  const depositMutation = useDeposit();
  const withdrawMutation = useWithdraw();

  const handleDeposit = () => {
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) return;
    depositMutation.mutate(
      { potId, amountUsd: value },
      { onSuccess: () => setAmount("") }
    );
  };

  const handleWithdraw = () => {
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) return;
    withdrawMutation.mutate(
      { potId, amountUsd: value },
      { onSuccess: () => setAmount("") }
    );
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="p-3">
        <CardTitle className="text-sm">Stake in Pot</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        <StakeStats
          nav={nav}
          lpPrice={lpPrice}
          yourStake={yourStake}
          totalStakers={totalStakers}
        />

        <Tabs defaultValue="deposit">
          <TabsList className="w-full h-8">
            <TabsTrigger value="deposit" className="text-xs flex-1">Deposit</TabsTrigger>
            <TabsTrigger value="withdraw" className="text-xs flex-1">Withdraw</TabsTrigger>
          </TabsList>

          <TabsContent value="deposit" className="space-y-2 mt-2">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Amount (USDC)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                className="flex-1"
              />
              <Button
                onClick={handleDeposit}
                disabled={!amount || depositMutation.isPending}
                size="sm"
              >
                {depositMutation.isPending ? "Depositing..." : "Deposit"}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              You'll receive LP tokens at the current LP price.
            </p>
          </TabsContent>

          <TabsContent value="withdraw" className="space-y-2 mt-2">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Amount (LP tokens)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                className="flex-1"
              />
              <Button
                onClick={handleWithdraw}
                disabled={!amount || withdrawMutation.isPending}
                size="sm"
                variant="outline"
              >
                {withdrawMutation.isPending ? "Withdrawing..." : "Withdraw"}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Redeem LP tokens for USDC at current NAV.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
