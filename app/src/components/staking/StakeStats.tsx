import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Users, DollarSign, Coins } from "lucide-react";

type StakeStatsProps = {
  nav?: number;
  lpPrice?: number;
  yourStake?: number;
  totalStakers?: number;
  className?: string;
};

export default function StakeStats({
  nav = 0,
  lpPrice = 1,
  yourStake = 0,
  totalStakers = 0,
  className,
}: StakeStatsProps) {
  const stats = [
    {
      label: "Pot NAV",
      value: `$${nav.toFixed(2)}`,
      icon: DollarSign,
      color: "text-green-500",
    },
    {
      label: "LP Price",
      value: `$${lpPrice.toFixed(4)}`,
      icon: Coins,
      color: "text-blue-500",
    },
    {
      label: "Your Stake",
      value: `$${yourStake.toFixed(2)}`,
      icon: TrendingUp,
      color: "text-purple-500",
    },
    {
      label: "Stakers",
      value: totalStakers.toString(),
      icon: Users,
      color: "text-orange-500",
    },
  ];

  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg border bg-card p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <stat.icon className={cn("h-3 w-3", stat.color)} />
            <span className="text-[10px] text-muted-foreground">{stat.label}</span>
          </div>
          <p className="text-sm font-bold tabular-nums">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
