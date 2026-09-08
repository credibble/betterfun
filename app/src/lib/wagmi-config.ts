import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { somniaTestnet } from "./chains";

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID ?? "";

export const wagmiAdapter = new WagmiAdapter({
  networks: [somniaTestnet],
  projectId,
});

export const config = wagmiAdapter.wagmiConfig;
