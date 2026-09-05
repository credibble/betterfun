import { http, createConfig } from "wagmi";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { somniaTestnet } from "./chains";

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID ?? "";

export const wagmiConfig = createConfig({
  chains: [somniaTestnet],
  transports: {
    [somniaTestnet.id]: http("https://api.infra.testnet.somnia.network"),
  },
});

export const wagmiAdapter = new WagmiAdapter({
  networks: [somniaTestnet],
  projectId,
});

export const config = wagmiAdapter.wagmiConfig;
