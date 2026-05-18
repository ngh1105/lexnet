# LexNet Current Project Map

> Last updated: 2026-05-17

## Purpose

LexNet is an AI-verified commerce trust platform for commerce cases, evidence review, settlement recommendations, and privacy-safe trust passports.

The current implementation is recommendation-only. It does not custody funds, execute payouts, or claim fake on-chain settlement.

## Active Areas

- `contracts/lexnet_commerce_core.py` - GenLayer Intelligent Contract boundary for commerce cases, evidence, verification, recommendations, and trust passports.
- `frontend/src/lib/lexnet-*.ts` - core commerce domain types, pure domain logic, verification adapters, contract readiness, service reads, and client fallback storage.
- `frontend/src/lib/genlayer-*.ts` - narrow GenLayer SDK/execution adapters. App code should use this boundary instead of SDK internals.
- `frontend/src/lib/platform/` - filesystem-backed platform store, passports, API helpers, demo/production auth, readiness, observability, evidence policy, backups, seed data, and demo package summaries.
- `frontend/src/components/` - dashboard, case detail, intake, passport, contract readiness, wallet status, sidebar, icons, and shared UI components.
- `frontend/src/app/` - App Router pages and API routes.
- `frontend/src/providers/` - Web3/RainbowKit provider gate.
- `frontend/scripts/` - demo seed/reset/dev/backup/restore, GenLayer readiness, and compatibility readiness scripts.
- `frontend/tests/` - active domain and platform tests.

## Frontend Domain Logic

- `frontend/src/lib/lexnet-types.ts` - commerce case, evidence, report, and trust passport type definitions.
- `frontend/src/lib/lexnet-domain.ts` - pure domain functions for cases, evidence, stats, timeline, and passport scoring.
- `frontend/src/lib/lexnet-verification.ts` - verification adapter interface and deterministic scoring.
- `frontend/src/lib/lexnet-contract.ts` - GenLayer readiness/config facade, guarded contract payload previews, and verify-case execution planning.
- `frontend/src/lib/genlayer-client.ts` - narrow adapter around `genlayer-js`; app code should use this boundary instead of SDK internals.
- `frontend/src/lib/genlayer-execution.ts` - maps GenLayer execution records to safe UI labels and proof actions.
- `frontend/src/lib/lexnet-service.ts` - seed cases, runtime mode, and backend-aware case reads.
- `frontend/src/lib/lexnet-client-store.ts` - browser localStorage fallback/cache for demo-created cases.

## Platform Backend Layer

- `frontend/src/lib/platform/types.ts` - platform records for workspaces, operators, queue items, published passports, audit events, and summaries.
- `frontend/src/lib/platform/store.ts` - filesystem JSON store at `.lexnet-data/store.json`, safe read/write/mutate helpers, dashboard data helpers, passport DTO helpers, and audit metadata.
- `frontend/src/lib/platform/passports.ts` - private passport generation, stable subject keys, public redaction, value banding, and public lookup.
- `frontend/src/lib/platform/api.ts` - shared JSON responses, request parsing, security status, and lightweight rate limiting.
- `frontend/src/lib/platform/auth.ts` - demo-private operator authorization helpers and production trusted-header mutation authorization.
- `frontend/src/lib/platform/production-auth.ts` - production trusted-header HMAC verification for gateway-signed operator context.
- `frontend/src/lib/platform/persistence-adapter.ts` - persistence adapter status for filesystem versus future managed database backends.
- `frontend/src/lib/platform/observability.ts` - redacted platform observability counters and production auth audit event builders.
- `frontend/src/lib/platform/evidence-policy.ts` - evidence URL policy and retention configuration enforcement.
- `frontend/src/lib/platform/passport-copy.ts` - shared trust passport publication copy.
- `frontend/src/lib/platform/readiness.ts` - runtime mode, auth, persistence, evidence policy, GenLayer readiness, and public-safe security status helpers.
- `frontend/src/lib/platform/demo-seed.ts` - deterministic demo data for the platform store.
- `frontend/src/lib/platform/pilot-summary.ts` - demo package summary counts using platform store data and readiness helpers.

## Frontend Components

- `frontend/src/components/CommerceDashboardClient.tsx` - command-center dashboard, backend summary, and operator queue panels.
- `frontend/src/components/CaseDetailClient.tsx` - case detail, evidence, verification, report, and readiness UI.
- `frontend/src/components/NewCaseForm.tsx` - new commerce case intake.
- `frontend/src/components/TrustPassportsClient.tsx` - trust passport list, backend publishing state, and publish/unpublish controls.
- `frontend/src/components/PublicPassportClient.tsx` - privacy-safe public passport presentation.
- `frontend/src/components/ContractCallPreview.tsx` - guarded GenLayer payload preview UI.
- `frontend/src/components/ContractReadinessPanel.tsx` - contract/readiness status panel.
- `frontend/src/components/PlatformReadinessClient.tsx` - redacted readiness and observability UI.
- `frontend/src/components/WalletAwareReadiness.tsx` - wallet-aware readiness messaging.
- `frontend/src/components/WalletConnectStatus.tsx` - topbar wallet connect/status control.
- `frontend/src/components/Sidebar.tsx` - navigation shell.
- `frontend/src/components/icons.ts` - Phosphor icon adapter.
- `frontend/src/components/ui/Metric.tsx` - reusable metric card UI.
- `frontend/src/components/ui/Panel.tsx` - reusable panel shell UI.
- `frontend/src/components/ui/StatusChip.tsx` - reusable status chip UI.

## Frontend Shell, Providers, and Tests

- `frontend/src/app/layout.tsx` - root layout and Web3Provider wiring.
- `frontend/src/app/globals.css` - application styling.
- `frontend/src/providers/Web3Provider.tsx` - RainbowKit/Wagmi provider gate.
- `frontend/package.json` - dependencies and scripts.
- `frontend/scripts/demo-seed.ts` - writes deterministic full command-center demo data to `.lexnet-data/store.json`.
- `frontend/scripts/demo-reset.ts` - removes only `.lexnet-data/store.json` for local demo reset.
- `frontend/scripts/demo-dev.ts` - starts the demo dev server on the first available demo port.
- `frontend/scripts/dev-port.ts` - selects demo dev ports, preferring `3002` then `3003`.
- `frontend/scripts/demo-backup.ts` - writes a local `.lexnet-data/store.json` backup.
- `frontend/scripts/demo-restore.ts` - restores `.lexnet-data/store.json` from a selected local backup.
- `frontend/scripts/pilot-check.ts` - compatibility readiness command that prints readiness, store counts, git-ignore status, and forbidden secret-like key scan.
- `frontend/scripts/pilot-prepare.ts` - compatibility readiness command that refuses production mode, resets/seeds deterministic demo data, and prints package summary/readiness.
- `frontend/tests/lexnet-domain.test.ts` - active domain tests.
- `frontend/tests/platform.test.ts` - active platform/backend tests.

## Active Routes

### Pages

- `/` - backend-aware commerce trust dashboard.
- `/cases/new` - new case intake.
- `/cases/[id]` - case detail, evidence, verification, and recommendations.
- `/passports` - operator trust passport records and publishing controls.
- `/platform` - redacted production readiness and observability control-plane view.
- `/passport/[slug]` - public privacy-safe trust passport page.

### API Routes

- `/api/workspaces` - demo-private workspace and membership summary.
- `/api/operators` - demo-private operator summary.
- `/api/queue` - demo-private review queue summary.
- `/api/passports` - demo-private passport generation and publish/unpublish actions.
- `/api/passports/public/[slug]` - public privacy-safe passport JSON.
- `/api/admin/backup` - demo-private backup/export summary.
- `/api/genlayer/verify-case` - guarded SDK write endpoint for `verify_case`.
- `/api/genlayer/cases/[caseId]` - guarded contract state read-back for verification proof.
- `/api/security/status` - public platform/security readiness status.
- `/api/platform/status` - public redacted readiness and observability status.

## Commands

Run from the repo root:

```bash
npm --prefix frontend run dev
npm --prefix frontend run test:platform
npm --prefix frontend run test:domain
npm --prefix frontend exec tsc -- -p frontend/tsconfig.json --noEmit
npm --prefix frontend run build
npm --prefix frontend run pilot:check
```

The demo dev server uses port `3002`.

## Storage And Env

- Backend mode uses `.lexnet-data/store.json` as the filesystem source of truth for persisted platform records.
- Persisted records include commerce cases, workspaces, operators, memberships, queue items, published passports, audit events, and GenLayer executions.
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
NEXT_PUBLIC_LEXNET_OWNER_WALLET_ADDRESS=
```

Demo-private backend API configuration:

```bash
LEXNET_RUNTIME_MODE=local-demo
LEXNET_ENABLE_DEMO_PRIVATE_API=true
LEXNET_DEMO_PRIVATE_API_TOKEN=
LEXNET_PRODUCTION_AUTH_PROVIDER=
LEXNET_PRODUCTION_AUTH_MODE=off
LEXNET_PRODUCTION_AUTH_SECRET=
LEXNET_PRODUCTION_AUTH_CLOCK_SKEW_SECONDS=60
LEXNET_MANAGED_PERSISTENCE_PROVIDER=
LEXNET_MANAGED_DATABASE_URL=
LEXNET_EVIDENCE_RETENTION_POLICY=
```

Demo-private API calls also require header `x-lexnet-operator-id: operator-demo`. If `LEXNET_DEMO_PRIVATE_API_TOKEN` is set, include `Authorization: Bearer <token>` as well. Production trusted-header mode requires gateway-signed operator headers; do not place real secrets in docs or committed env files. Production mutation routes fail closed unless `LEXNET_PRODUCTION_AUTH_PROVIDER=trusted-header`, `LEXNET_PRODUCTION_AUTH_MODE=trusted-header`, and `LEXNET_PRODUCTION_AUTH_SECRET` are configured together. Production mode fails closed unless managed persistence is configured with provider `postgres` and a managed database URL. Production evidence requires HTTPS public URLs plus `LEXNET_EVIDENCE_RETENTION_POLICY=metadata-{days}d`. Raw evidence storage remains disabled; LexNet stores metadata and trust signals only. The current sprint introduces the adapter boundary and readiness enforcement; the filesystem store remains the local demo implementation. `/api/platform/status` returns redacted readiness and observability counters only. It must not return raw audit event payloads, operators, memberships, evidence URLs, unpublished passport records, secrets, database URLs, payout status, or settlement finality claims.

## Case State Machine

```text
DRAFT -> ACTIVE -> EVIDENCE_SUBMITTED -> UNDER_AI_REVIEW -> VERIFIED
                                                |-> REVISION_REQUESTED
                                                |-> DISPUTED
                                                |-> SETTLEMENT_RECOMMENDED
```

## Verification Verdicts

`APPROVE` | `REVISE` | `REJECT` | `SPLIT_RECOMMENDED`

## Read Only By Explicit Request

- `docs/archive/` - old specs and roadmaps.
- `genlayer-js/` - vendored SDK package source; do not edit directly. Use `frontend/src/lib/genlayer-client.ts` for app integration.
- `.agent/`, `.shared/` - tooling, not active product code.
- `.claude/` - agent caches and duplicated worktrees.
- `docs/superpowers/` - historical agent plans/specs.
- `frontend/package-lock.json`, `genlayer-js/package-lock.json`, `genlayer-js/*.tgz` - large dependency artifacts.
- `docs/archive/test_escrow_lifecycle.py` - archived old escrow contract test.
