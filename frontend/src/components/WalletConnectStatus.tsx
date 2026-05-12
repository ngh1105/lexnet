"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { WalletCards } from "lucide-react";
import { isWalletConnectConfigured } from "@/providers/Web3Provider";

export default function WalletConnectStatus() {
  if (isWalletConnectConfigured) {
    return (
      <ConnectButton
        chainStatus="icon"
        accountStatus="address"
        showBalance={false}
      />
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        minHeight: 38,
        padding: "0 12px",
        borderRadius: 8,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        color: "var(--ink)",
        fontSize: 12,
        lineHeight: 1.25,
        fontWeight: 800,
        boxShadow: "var(--shadow-sm)",
      }}
      title="Add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in .env.local to enable the live wallet button."
    >
      <WalletCards size={15} strokeWidth={1.75} />
      Wallet Setup Needed
    </div>
  );
}
