# Demo Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make LexNet reliable for a live demo by clarifying wallet setup, showing operation/data flow, and reducing avoidable render overhead without fake on-chain behavior.

**Architecture:** Keep the local verification path stable while making the wallet path conditional on a real WalletConnect project ID. Split wallet provider setup into a lazy-loaded bridge, add a focused wallet status component, and improve existing readiness/payload panels rather than restructuring the app.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, RainbowKit, Wagmi, React Query, GenLayer Studionet chain config, Chrome DevTools performance tracing, Node test runner via `tsx --test`.

---

## File Structure

- Modify `frontend/src/providers/Web3Provider.tsx`: read wallet env and lazy-load wallet providers only when configured.
- Create `frontend/src/providers/WalletProviderBridge.tsx`: own Wagmi/RainbowKit/React Query setup for the configured wallet path.
- Create `frontend/src/components/WalletConnectStatus.tsx`: render RainbowKit `ConnectButton` when enabled, otherwise render setup guidance.
- Modify `frontend/src/components/Sidebar.tsx`: use `WalletConnectStatus` instead of directly importing RainbowKit.
- Modify `frontend/src/components/ContractReadinessPanel.tsx`: add operation flow explanation and keep guarded write button disabled.
- Modify `frontend/src/components/ContractCallPreview.tsx`: label the JSON payload as the data sent to GenLayer.
- Modify `frontend/src/app/globals.css`: remove duplicate external Google Fonts import because `layout.tsx` already uses `next/font/google`.
- Verify with `frontend/tests/lexnet-domain.test.ts`, TypeScript, and Next production build.

---

### Task 1: Wallet Provider Gating

**Files:**
- Modify: `frontend/src/providers/Web3Provider.tsx`
- Create: `frontend/src/providers/WalletProviderBridge.tsx`

- [ ] **Step 1: Inspect the current provider**

Run:

```powershell
Get-Content E:\Dapp\LexNet\frontend\src\providers\Web3Provider.tsx
```

Expected: file currently initializes or controls RainbowKit/Wagmi and exports `isWalletConnectConfigured`.

- [ ] **Step 2: Replace `Web3Provider.tsx` with conditional lazy loading**

Set `frontend/src/providers/Web3Provider.tsx` to:

```tsx
"use client";

import dynamic from "next/dynamic";
import { ReactNode } from "react";

const configuredWalletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

export const isWalletConnectConfigured = configuredWalletConnectProjectId.trim().length > 0;
export const walletConnectProjectId = configuredWalletConnectProjectId;

const WalletProviderBridge = dynamic(() => import("@/providers/WalletProviderBridge"), {
  ssr: false,
});

export function Web3Provider({ children }: { children: ReactNode }) {
  if (!isWalletConnectConfigured) {
    return <>{children}</>;
  }

  return <WalletProviderBridge>{children}</WalletProviderBridge>;
}
```

- [ ] **Step 3: Create `WalletProviderBridge.tsx`**

Set `frontend/src/providers/WalletProviderBridge.tsx` to:

```tsx
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
```

- [ ] **Step 4: Run TypeScript for provider changes**

Run:

```powershell
cd E:\Dapp\LexNet\frontend
.\node_modules\.bin\tsc.cmd --noEmit -p .\tsconfig.json
```

Expected: exit code 0 and no TypeScript output.

- [ ] **Step 5: Commit wallet provider gating**

Run:

```powershell
git -C E:\Dapp\LexNet add frontend/src/providers/Web3Provider.tsx frontend/src/providers/WalletProviderBridge.tsx
git -C E:\Dapp\LexNet commit -m "feat: gate wallet provider setup"
```

Expected: commit succeeds and includes only the provider files.

---

### Task 2: Wallet Status UI

**Files:**
- Create: `frontend/src/components/WalletConnectStatus.tsx`
- Modify: `frontend/src/components/Sidebar.tsx`

- [ ] **Step 1: Create wallet status component**

Set `frontend/src/components/WalletConnectStatus.tsx` to:

```tsx
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
```

- [ ] **Step 2: Update `Sidebar.tsx` imports**

In `frontend/src/components/Sidebar.tsx`, remove these imports if present:

```tsx
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { isWalletConnectConfigured } from "@/providers/Web3Provider";
```

Add this import:

```tsx
import WalletConnectStatus from "@/components/WalletConnectStatus";
```

- [ ] **Step 3: Replace sidebar wallet conditional**

In `frontend/src/components/Sidebar.tsx`, replace the old conditional wallet block with:

```tsx
<WalletConnectStatus />
```

The component should remain inside the bottom sidebar container, below the `Local MVP / GenLayer Ready` card.

- [ ] **Step 4: Verify the sidebar path typechecks**

Run:

```powershell
cd E:\Dapp\LexNet\frontend
.\node_modules\.bin\tsc.cmd --noEmit -p .\tsconfig.json
```

Expected: exit code 0 and no TypeScript output.

- [ ] **Step 5: Commit wallet status UI**

Run:

```powershell
git -C E:\Dapp\LexNet add frontend/src/components/WalletConnectStatus.tsx frontend/src/components/Sidebar.tsx
git -C E:\Dapp\LexNet commit -m "feat: show wallet connect readiness"
```

Expected: commit succeeds and includes only the wallet status/sidebar files.

---

### Task 3: Operation and Payload Clarity

**Files:**
- Modify: `frontend/src/components/ContractReadinessPanel.tsx`
- Modify: `frontend/src/components/ContractCallPreview.tsx`

- [ ] **Step 1: Add operation flow to readiness panel**

In `frontend/src/components/ContractReadinessPanel.tsx`, replace the disabled button block:

```tsx
<button type="button" className="btn-secondary" disabled title="Direct GenLayer writes are enabled in Phase 3.">
  <WalletCards size={15} strokeWidth={1.75} />
  Phase 3: Trigger GenLayer Write
</button>
```

with:

```tsx
<div
  style={{
    display: "grid",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--surface-subtle)",
  }}
>
  <div className="section-label">
    <WalletCards size={14} strokeWidth={1.75} />
    Operation Flow
  </div>
  <p className="muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.55 }}>
    1. Connect wallet with a WalletConnect project ID. 2. Confirm the contract,
    RPC, and wallet checks. 3. Copy or trigger the generated GenLayer payload.
  </p>
</div>

<button type="button" className="btn-secondary" disabled title="Direct GenLayer writes are enabled after all readiness checks pass.">
  <WalletCards size={15} strokeWidth={1.75} />
  Trigger GenLayer Write
</button>
```

- [ ] **Step 2: Label payload data in call preview**

In `frontend/src/components/ContractCallPreview.tsx`, replace the standalone `<pre>` payload block with:

```tsx
<div
  style={{
    display: "grid",
    gap: 6,
    padding: 10,
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--surface-subtle)",
  }}
>
  <span style={{ color: "var(--muted)", fontSize: 11, fontWeight: 800 }}>
    Data sent to GenLayer
  </span>
  <pre
    style={{
      margin: 0,
      maxHeight: 180,
      overflow: "auto",
      color: "var(--ink-soft)",
      fontSize: 11,
      lineHeight: 1.5,
    }}
  >
    {payloadText}
  </pre>
</div>
```

Keep the `Copy Payload` button below this block.

- [ ] **Step 3: Verify operation clarity typechecks**

Run:

```powershell
cd E:\Dapp\LexNet\frontend
.\node_modules\.bin\tsc.cmd --noEmit -p .\tsconfig.json
```

Expected: exit code 0 and no TypeScript output.

- [ ] **Step 4: Manual browser check**

Open:

```text
http://localhost:3002/cases/lx-case-003
```

Expected visible text in the inspector area:

```text
Operation Flow
Data sent to GenLayer
Trigger GenLayer Write
```

- [ ] **Step 5: Commit operation clarity**

Run:

```powershell
git -C E:\Dapp\LexNet add frontend/src/components/ContractReadinessPanel.tsx frontend/src/components/ContractCallPreview.tsx
git -C E:\Dapp\LexNet commit -m "feat: clarify genlayer operation flow"
```

Expected: commit succeeds and includes only readiness/payload UI files.

---

### Task 4: Render Smoothness Cleanup

**Files:**
- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Inspect font loading**

Run:

```powershell
Select-String -Path E:\Dapp\LexNet\frontend\src\app\layout.tsx,E:\Dapp\LexNet\frontend\src\app\globals.css -Pattern "next/font|fonts.googleapis|font-family"
```

Expected before the change: `layout.tsx` imports `Inter` from `next/font/google`, and `globals.css` may also import Google Fonts.

- [ ] **Step 2: Remove duplicate Google Fonts import**

In `frontend/src/app/globals.css`, remove this line if present:

```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap");
```

Keep this line at the top:

```css
@import "tailwindcss";
```

- [ ] **Step 3: Verify CSS change with production build**

Run:

```powershell
cd E:\Dapp\LexNet\frontend
npm run build
```

Expected: build exits 0 and prints `Compiled successfully`.

- [ ] **Step 4: Optional Chrome trace check**

Open a warm case detail page and run a Chrome performance trace for:

```text
http://localhost:3002/cases/lx-case-003
```

Expected: trace shows fast LCP and no avoidable `fonts.googleapis.com` CSS import caused by `globals.css`.

- [ ] **Step 5: Commit render cleanup**

Run:

```powershell
git -C E:\Dapp\LexNet add frontend/src/app/globals.css
git -C E:\Dapp\LexNet commit -m "perf: remove duplicate font import"
```

Expected: commit succeeds and includes only `globals.css`.

---

### Task 5: Final Verification

**Files:**
- Verify: `frontend/tests/lexnet-domain.test.ts`
- Verify: `frontend/tsconfig.json`
- Verify: `frontend/package.json`

- [ ] **Step 1: Run domain tests**

Run:

```powershell
cd E:\Dapp\LexNet\frontend
npm run test:domain
```

Expected output includes:

```text
# pass 19
# fail 0
```

- [ ] **Step 2: Run TypeScript**

Run:

```powershell
cd E:\Dapp\LexNet\frontend
.\node_modules\.bin\tsc.cmd --noEmit -p .\tsconfig.json
```

Expected: exit code 0 and no TypeScript output.

- [ ] **Step 3: Run production build**

Run:

```powershell
cd E:\Dapp\LexNet\frontend
npm run build
```

Expected output includes:

```text
Compiled successfully
```

- [ ] **Step 4: Inspect final git status**

Run:

```powershell
git -C E:\Dapp\LexNet status --short
```

Expected: no uncommitted changes for the files covered by this plan. If `.superpowers/` appears, do not commit it; leave it untracked or add it to local ignore only if requested.

- [ ] **Step 5: Report verification evidence**

Report these facts to the user:

```text
Domain tests: 19 pass, 0 fail
TypeScript: pass
Next build: pass
Wallet behavior: no provider initialization without NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID; ConnectButton path enabled only with real project ID
Demo clarity: Operation Flow and Data sent to GenLayer visible on case detail
Performance: duplicate Google Fonts CSS import removed; wallet provider lazy-loaded
```

---

## Self-Review

- Spec coverage: wallet readiness maps to Tasks 1-2, operation/data visibility maps to Task 3, render smoothness maps to Task 4, verification maps to Task 5.
- Placeholder scan: no TBD/TODO/fill-in-later steps remain. Each code step includes exact content or exact replacement blocks.
- Type consistency: `isWalletConnectConfigured`, `walletConnectProjectId`, `WalletProviderBridge`, and `WalletConnectStatus` names match across tasks.
- Scope check: plan is focused on demo readiness only; real browser-side GenLayer writes remain out of scope.
