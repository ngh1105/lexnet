# LexNet Demo Readiness Design

## Goal

Bring LexNet to a reliable demo state for the AI-verified commerce trust direction. The demo must make wallet setup visible, explain what data and operations are being used, avoid fake on-chain behavior, and keep page rendering smooth enough for a live walkthrough.

## Scope

This design covers three linked demo-readiness areas:

1. Wallet connect readiness and safe fallback behavior.
2. Operation and data visibility on the dashboard and case detail views.
3. Frontend render smoothness for the local and production demo paths.

It does not implement real GenLayer browser writes yet. Direct on-chain writes remain guarded until a real WalletConnect project ID, wallet, contract address, RPC, and write adapter are all verified.

## Current Problems

- The wallet connect button is not visible when `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is missing. The app avoids initializing RainbowKit in this state to prevent WalletConnect/Reown runtime errors.
- The case detail page shows readiness and payload data, but the operation story is not explicit enough for a first-time viewer.
- Chrome trace showed runtime render is fast on a warm page, but duplicate Google Fonts loading adds unnecessary third-party overhead. The wallet stack should also stay out of the local-only demo path.

## Design

### 1. Wallet Demo Readiness

The app uses a strict no-fake-wallet rule.

- `Web3Provider` reads `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`.
- If the value is empty, the app does not initialize Wagmi or RainbowKit.
- Sidebar renders a visible `WalletConnectStatus` panel that explains how to enable the live wallet button.
- If the value is present, the app lazy-loads a `WalletProviderBridge` that initializes Wagmi, RainbowKit, React Query, and GenLayer Studionet chain config.
- Sidebar then renders RainbowKit `ConnectButton`.

Success criteria:

- Missing project ID does not crash the app.
- Missing project ID does not trigger fake Reown/WalletConnect requests.
- Real project ID shows a visible connect wallet button.
- The UI tells the demo operator exactly what env var to configure.

### 2. Operation and Data Visibility

The case detail page should explain the live demo flow in plain product terms.

- `ContractReadinessPanel` keeps the current readiness checks: contract, network, RPC, and wallet.
- It adds an `Operation Flow` section explaining the sequence: connect wallet, pass readiness checks, then copy or trigger the generated GenLayer payload.
- `ContractCallPreview` labels the JSON as `Data sent to GenLayer` so viewers understand the payload's role.
- Local verification remains explicitly labeled as the active fallback path.

Success criteria:

- A viewer can tell whether the app is in local verification mode or guarded on-chain mode.
- A viewer can identify which case data becomes the GenLayer payload.
- A viewer can identify the blocker when wallet execution is not ready.

### 3. Render Smoothness

The demo should avoid avoidable third-party and wallet overhead.

- Remove the duplicate Google Fonts CSS import from `globals.css` because `layout.tsx` already uses `next/font/google`.
- Lazy-load wallet provider code only when a real WalletConnect project ID exists.
- Continue using Chrome DevTools traces to distinguish app runtime cost from Next.js dev-server cold compile.

Success criteria:

- Production build passes.
- Warm page trace remains fast and has no avoidable Google Fonts third-party import from CSS.
- Local-only demo mode avoids loading wallet provider dependencies.

## Components and Files

- `frontend/src/providers/Web3Provider.tsx` decides whether wallet support is enabled.
- `frontend/src/providers/WalletProviderBridge.tsx` owns Wagmi/RainbowKit setup when enabled.
- `frontend/src/components/WalletConnectStatus.tsx` renders either `ConnectButton` or setup guidance.
- `frontend/src/components/Sidebar.tsx` displays wallet state consistently.
- `frontend/src/components/ContractReadinessPanel.tsx` explains readiness and operation flow.
- `frontend/src/components/ContractCallPreview.tsx` shows the GenLayer method and payload.
- `frontend/src/app/globals.css` avoids duplicate external font loading.

## Testing and Verification

Run these before committing:

```bash
cd frontend
npm run test:domain
.\node_modules\.bin\tsc.cmd --noEmit -p .\tsconfig.json
npm run build
```

Manual verification:

- Open dashboard and a case detail page without `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`; confirm the app loads and shows wallet setup guidance.
- If a real WalletConnect project ID is available, add it to `.env.local`, restart the dev server, and confirm `ConnectButton` appears.
- Use Chrome DevTools trace on a warm case detail page to verify runtime render is smooth.

## Out of Scope

- Fake WalletConnect project IDs.
- Browser-side GenLayer write execution without verified wallet and adapter support.
- Reintroducing the old escrow/backend prototype.
- Mock on-chain confirmations.
