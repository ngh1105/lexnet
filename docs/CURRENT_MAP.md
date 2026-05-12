# LexNet Current Project Map

> Last updated: 2026-05-12

## What is LexNet

LexNet is an AI-verified commerce trust platform. Buyers and sellers create commerce cases, attach delivery evidence, run deterministic/GenLayer-ready verification, receive settlement recommendations, and build portable trust passports.

The current implementation is recommendation-only. It does not custody funds, execute payouts, or claim fake on-chain settlement.

## Active Source Files

### Contract

- `contracts/lexnet_commerce_core.py` — GenLayer Intelligent Contract boundary for commerce cases, evidence, verification, recommendations, and trust passports. It is recommendation-only and does not custody funds.

### Frontend Domain Logic

- `frontend/src/lib/lexnet-types.ts` — commerce case, evidence, report, and trust passport type definitions.
- `frontend/src/lib/lexnet-domain.ts` — pure domain functions for cases, evidence, stats, timeline, and passport scoring.
- `frontend/src/lib/lexnet-verification.ts` — verification adapter interface and deterministic scoring.
- `frontend/src/lib/lexnet-contract.ts` — GenLayer readiness/config facade and guarded contract payload previews.
- `frontend/src/lib/lexnet-service.ts` — seed cases, runtime mode, and backend-aware case reads.
- `frontend/src/lib/lexnet-client-store.ts` — browser localStorage fallback/cache for demo-created cases.

### Platform Backend Layer

- `frontend/src/lib/platform/types.ts` — platform records for workspaces, operators, queue items, published passports, audit events, and summaries.
- `frontend/src/lib/platform/store.ts` — filesystem JSON store at `.lexnet-data/store.json`, safe read/write/mutate helpers, dashboard data helpers, passport DTO helpers, and audit metadata.
- `frontend/src/lib/platform/passports.ts` — private passport generation, stable subject keys, public redaction, value banding, and public lookup.
- `frontend/src/lib/platform/api.ts` — shared JSON responses, request parsing, security status, and lightweight rate limiting.
- `frontend/src/lib/platform/auth.ts` — demo-private operator authorization helpers. This is not production OAuth.

### Frontend Components

- `frontend/src/components/CommerceDashboardClient.tsx` — command-center dashboard, backend summary, and operator queue panels.
- `frontend/src/components/CaseDetailClient.tsx` — case detail, evidence, verification, report, and readiness UI.
- `frontend/src/components/NewCaseForm.tsx` — new commerce case intake.
- `frontend/src/components/TrustPassportsClient.tsx` — trust passport list, backend publishing state, and publish/unpublish controls.
- `frontend/src/components/PublicPassportClient.tsx` — privacy-safe public passport presentation.
- `frontend/src/components/ContractCallPreview.tsx` — guarded GenLayer payload preview UI.
- `frontend/src/components/ContractReadinessPanel.tsx` — contract/readiness status panel.
- `frontend/src/components/WalletAwareReadiness.tsx` — wallet-aware readiness messaging.
- `frontend/src/components/WalletConnectStatus.tsx` — topbar wallet connect/status control.
- `frontend/src/components/Sidebar.tsx` — navigation shell.
- `frontend/src/components/ui/Metric.tsx` — reusable metric card UI.
- `frontend/src/components/ui/Panel.tsx` — reusable panel shell UI.
- `frontend/src/components/ui/StatusChip.tsx` — reusable status chip UI.

### Frontend Shell, Providers, and Tests

- `frontend/src/app/layout.tsx` — root layout and Web3Provider wiring.
- `frontend/src/app/globals.css` — application styling.
- `frontend/src/providers/Web3Provider.tsx` — RainbowKit/Wagmi provider gate.
- `frontend/package.json` — dependencies and scripts.
- `frontend/tests/lexnet-domain.test.ts` — active domain tests.
- `frontend/tests/platform.test.ts` — active platform/backend tests.

## Active Routes

### Pages

- `/` — backend-aware commerce trust dashboard.
- `/cases/new` — new case intake.
- `/cases/[id]` — case detail, evidence, verification, and recommendations.
- `/passports` — operator trust passport records and publishing controls.
- `/passport/[slug]` — public privacy-safe trust passport page.

### API Routes

- `/api/workspaces` — demo-private workspace and membership summary.
- `/api/operators` — demo-private operator summary.
- `/api/queue` — demo-private review queue summary.
- `/api/passports` — demo-private passport generation and publish/unpublish actions.
- `/api/passports/public/[slug]` — public privacy-safe passport JSON.
- `/api/admin/backup` — demo-private backup/export summary.
- `/api/security/status` — platform/security readiness status.

## Commands

Run from the repository/worktree root:

```bash
npm --prefix frontend run dev
npm --prefix frontend run test:platform
npm --prefix frontend run test:domain
npm --prefix frontend exec tsc -- --noEmit
npm --prefix frontend run build
```

The dev server runs on port `3002`.

## Storage Model

- Backend mode uses `.lexnet-data/store.json` as the filesystem source of truth for persisted platform records.
- Persisted records include commerce cases, workspaces, operators, memberships, queue items, published passports, and audit events.
- Browser `localStorage` remains a local demo fallback/cache for client-created cases.
- Backend-facing helpers preserve seed/demo fallbacks when the filesystem store is missing or invalid.
- Do not commit `.lexnet-data/`, `.env.local`, generated private keys, or local demo secrets.

## Environment Variables

Public frontend configuration:

```bash
NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS=
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

Demo-private backend API configuration:

```bash
LEXNET_ENABLE_DEMO_PRIVATE_API=true
```

Demo-private API calls also require header `x-lexnet-operator-id: operator-demo`.

## Case State Machine

```text
DRAFT → ACTIVE → EVIDENCE_SUBMITTED → UNDER_AI_REVIEW → VERIFIED
                                                   ├→ REVISION_REQUESTED
                                                   ├→ DISPUTED
                                                   └→ SETTLEMENT_RECOMMENDED
```

## Verification Verdicts

`APPROVE` | `REVISE` | `REJECT` | `SPLIT_RECOMMENDED`

## Deprecated / Do Not Read

- `docs/archive/` — old specs and roadmaps.
- `genlayer-js/` — vendored SDK, reference only.
- `.agent/`, `.shared/` — tooling, not active product code.
- `docs/archive/test_escrow_lifecycle.py` — archived old escrow contract test.
