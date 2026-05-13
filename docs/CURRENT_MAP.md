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
- `frontend/src/lib/lexnet-contract.ts` — GenLayer readiness/config facade, guarded contract payload previews, and verify-case execution planning.
- `frontend/src/lib/genlayer-client.ts` — narrow adapter around `genlayer-js`; app code should use this boundary instead of SDK internals.
- `frontend/src/lib/genlayer-execution.ts` — maps GenLayer execution records to safe UI labels and proof actions.
- `frontend/src/lib/lexnet-service.ts` — seed cases, runtime mode, and backend-aware case reads.
- `frontend/src/lib/lexnet-client-store.ts` — browser localStorage fallback/cache for demo-created cases.

### Platform Backend Layer

- `frontend/src/lib/platform/types.ts` — platform records for workspaces, operators, queue items, published passports, audit events, and summaries.
- `frontend/src/lib/platform/store.ts` — filesystem JSON store at `.lexnet-data/store.json`, safe read/write/mutate helpers, dashboard data helpers, passport DTO helpers, and audit metadata.
- `frontend/src/lib/platform/passports.ts` — private passport generation, stable subject keys, public redaction, value banding, and public lookup.
- `frontend/src/lib/platform/api.ts` — shared JSON responses, request parsing, security status, and lightweight rate limiting.
- `frontend/src/lib/platform/auth.ts` — demo-private operator authorization helpers. This is not production OAuth.
- `frontend/src/lib/platform/production-auth.ts` — production trusted-header HMAC verification for gateway-signed operator context.
- `frontend/src/lib/platform/persistence-adapter.ts` — persistence adapter status for filesystem versus future managed database backends.
- `frontend/src/lib/platform/evidence-policy.ts` — evidence URL policy and retention configuration enforcement.
- `frontend/src/lib/platform/readiness.ts` — runtime mode, auth, persistence, evidence policy, GenLayer readiness, and public-safe security status helpers.
- `frontend/src/lib/platform/pilot-summary.ts` — pilot/package summary counts using platform store data and readiness helpers.

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
- `frontend/scripts/demo-seed.ts` — writes deterministic full command-center demo data to `.lexnet-data/store.json`.
- `frontend/scripts/demo-reset.ts` — removes only `.lexnet-data/store.json` for local demo reset.
- `frontend/scripts/demo-dev.ts` — starts the demo dev server on the first available demo port.
- `frontend/scripts/dev-port.ts` — selects demo dev ports, preferring `3002` then `3003`.
- `frontend/scripts/demo-backup.ts` — writes a local `.lexnet-data/store.json` backup.
- `frontend/scripts/demo-restore.ts` — restores `.lexnet-data/store.json` from a selected local backup.
- `frontend/scripts/pilot-check.ts` — prints readiness, store counts, git-ignore status, and forbidden secret-like key scan.
- `frontend/scripts/pilot-prepare.ts` — refuses production mode, resets/seeds deterministic pilot data, and prints pilot summary/readiness.
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
- `/api/genlayer/verify-case` — demo-private guarded SDK write endpoint for `verify_case`.
- `/api/genlayer/cases/[caseId]` — demo-private contract state read-back for verification proof.
- `/api/security/status` — platform/security readiness status.

## Commands

Core commands, run from the repository/worktree root:

```bash
npm --prefix frontend run dev
npm --prefix frontend run test:platform
npm --prefix frontend run test:domain
npm --prefix frontend exec tsc -- --noEmit
npm --prefix frontend run build
```

Additional active frontend package scripts:

```bash
npm --prefix frontend run start
npm --prefix frontend run demo:seed
npm --prefix frontend run demo:reset
npm --prefix frontend run demo:dev
npm --prefix frontend run demo:backup
npm --prefix frontend run demo:restore -- <backup-path>
npm --prefix frontend run demo:genlayer-readiness
npm --prefix frontend run pilot:check
npm --prefix frontend run pilot:prepare
npm --prefix frontend run verify:mvp
npm --prefix frontend run verify:skeleton
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
NEXT_PUBLIC_GENLAYER_NETWORK_LABEL=Studionet
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

Demo-private backend API configuration:

```bash
LEXNET_RUNTIME_MODE=local-demo
LEXNET_ENABLE_DEMO_PRIVATE_API=true
LEXNET_DEMO_PRIVATE_API_TOKEN=
LEXNET_PRODUCTION_AUTH_PROVIDER=
LEXNET_PRODUCTION_AUTH_MODE=off
LEXNET_PRODUCTION_AUTH_SECRET=
LEXNET_PRODUCTION_AUTH_CLOCK_SKEW_SECONDS=300
LEXNET_MANAGED_DATABASE_URL=
LEXNET_MANAGED_PERSISTENCE_PROVIDER=
LEXNET_EVIDENCE_RETENTION_POLICY=
```

Demo-private API calls also require header `x-lexnet-operator-id: operator-demo`. If `LEXNET_DEMO_PRIVATE_API_TOKEN` is set, include `Authorization: Bearer <token>` as well. Production trusted-header mode requires gateway-signed operator headers; do not place real secrets in docs or committed env files.

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
- `genlayer-js/` — vendored SDK package source; do not edit directly. Use `frontend/src/lib/genlayer-client.ts` for app integration.
- `.agent/`, `.shared/` — tooling, not active product code.
- `docs/archive/test_escrow_lifecycle.py` — archived old escrow contract test.
