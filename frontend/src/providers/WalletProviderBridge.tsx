"use client";

import "@rainbow-me/rainbowkit/styles.css";

import {
  darkTheme,
  getDefaultConfig,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import type { Chain } from "viem/chains";
import { studionet } from "genlayer-js/chains";
import { walletConnectProjectId } from "@/providers/Web3Provider";

const genlayerChain: Chain = {
  ...studionet,
} as unknown as Chain;

const queryClient = new QueryClient();

const config = getDefaultConfig({
  appName: "LexNet Commerce Trust",
  projectId: walletConnectProjectId,
  chains: [genlayerChain],
  ssr: true,
});

export default function WalletProviderBridge({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#3B82F6",
            accentColorForeground: "white",
            borderRadius: "large",
            fontStack: "system",
            overlayBlur: "small",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
