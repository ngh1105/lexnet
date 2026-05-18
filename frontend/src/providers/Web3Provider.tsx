"use client";

import dynamic from "next/dynamic";
import { ReactNode } from "react";

const configuredWalletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

export const isWalletConnectConfigured = configuredWalletConnectProjectId.trim().length > 0;
export const walletConnectProjectId =
  configuredWalletConnectProjectId.trim().length > 0
    ? configuredWalletConnectProjectId
    : "lexnet-local-demo";

const WalletProviderBridge = dynamic(() => import("@/providers/WalletProviderBridge"), {
  ssr: false,
});

export function Web3Provider({ children }: { children: ReactNode }) {
  return <WalletProviderBridge>{children}</WalletProviderBridge>;
}
