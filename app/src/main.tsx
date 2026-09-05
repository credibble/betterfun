import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { createAppKit } from "@reown/appkit/react";
import { wagmiAdapter, config } from "./lib/wagmi-config";
import { somniaTestnet } from "./lib/chains";
import { ExchangeProvider } from "./components/ExchangeProvider";
import "./styles.css";
import { routeTree } from "./routeTree.gen";

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID ?? "";

createAppKit({
  adapters: [wagmiAdapter],
  networks: [somniaTestnet],
  projectId,
  features: {
    analytics: false,
    email: false,
    socials: [],
  },
});

const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  context: { queryClient },
  scrollRestoration: true,
  defaultPreloadStaleTime: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("root")!;
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <ExchangeProvider>
          <RouterProvider router={router} />
        </ExchangeProvider>
      </WagmiProvider>
    </QueryClientProvider>
  </StrictMode>,
);
