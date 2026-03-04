"use client";

import "@rainbow-me/rainbowkit/styles.css";

import {
    getDefaultConfig,
    RainbowKitProvider,
    darkTheme,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import type { Chain } from "viem/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ReactNode } from "react";

import { studionet } from "genlayer-js/chains";

const genlayerChain: Chain = {
    ...studionet,
    // Add default RPC url to satisfy standard Chain type if needed, though spreading studionet usually works
} as unknown as Chain;

const config = getDefaultConfig({
    appName: "LexNet Escrow",
    projectId: "1356e48ab2eb00d23806297cefed0ffc", // Demo Project ID
    chains: [genlayerChain],
    ssr: true,
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider
                    theme={darkTheme({
                        accentColor: "#3B82F6", // matches our Blue-500
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
