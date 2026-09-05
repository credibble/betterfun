import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { toast } from "sonner";
import { LogOut, Wallet, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function LoginButton({ className }: { className?: string }) {
  const { isConnected, address } = useAccount();
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();

  if (!isConnected || !address) {
    return (
      <Button
        onClick={() => open()}
        className={cn("gap-2", className)}
        size="sm"
      >
        <Wallet className="h-4 w-4" />
        Connect wallet
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-2", className)}>
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {shortAddress(address)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onClick={() => {
            navigator.clipboard.writeText(address);
            toast.success("Address copied");
          }}
        >
          <Copy className="mr-2 h-4 w-4" />
          Copy address
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            window.open(
              `https://explorer.testnet.somnia.network/address/${address}`,
              "_blank",
            );
          }}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          View on explorer
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => disconnect()} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
