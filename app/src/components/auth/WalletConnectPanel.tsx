import { useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { toast } from "sonner";
import { Copy, ExternalLink, LogOut, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function WalletConnectPanel() {
  const [open, setOpen] = useState(false);
  const { isConnected, address, chain } = useAccount();
  const { open: openAppKit } = useAppKit();
  const { disconnect } = useDisconnect();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Wallet className="h-4 w-4" />
          {isConnected && address ? shortAddress(address) : "Connect"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Wallet</DialogTitle>
        </DialogHeader>

        {isConnected && address ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-secondary/30 p-4">
              <p className="text-xs text-muted-foreground">Connected address</p>
              <p className="mt-1 font-mono text-sm font-semibold">{shortAddress(address)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {chain?.name ?? "Unknown chain"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(address);
                  toast.success("Address copied");
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.open(
                    `https://explorer.testnet.somnia.network/address/${address}`,
                    "_blank",
                  );
                }}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Explorer
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  disconnect();
                  setOpen(false);
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Connect your Somnia testnet wallet to start trading.
            </p>
            <Button onClick={() => openAppKit()} className="w-full">
              <Wallet className="mr-2 h-4 w-4" />
              Connect wallet
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
