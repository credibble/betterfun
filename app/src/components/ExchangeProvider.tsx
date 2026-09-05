import { useMemo } from "react";
import { useWalletClient } from "wagmi";
import { SomniaMarketsProvider } from "@somnia-chain/markets-sdk/react";
import { createExchange } from "@/lib/exchange";

export function ExchangeProvider({ children }: { children: React.ReactNode }) {
  const { data: walletClient } = useWalletClient();

  const exchange = useMemo(
    () => createExchange(walletClient ?? undefined),
    [walletClient],
  );

  return (
    <SomniaMarketsProvider client={exchange.client}>
      {children}
    </SomniaMarketsProvider>
  );
}
