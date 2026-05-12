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
        padding: "10px 11px",
        borderRadius: 8,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "rgba(250,250,250,0.72)",
        fontSize: 11,
        lineHeight: 1.45,
        fontWeight: 700,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#fafafa" }}>
        <WalletCards size={15} strokeWidth={1.75} />
        Wallet Connect
      </div>
      <div style={{ marginTop: 6 }}>
        Add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in .env.local to enable the live wallet button.
      </div>
    </div>
  );
}
