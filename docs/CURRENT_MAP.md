# LexNet Current Project Map

> Last updated: 2026-05-13

## Purpose

LexNet is an AI-verified commerce trust platform for commerce cases, evidence review, settlement recommendations, and privacy-safe trust passports.

The current implementation is recommendation-only. It does not custody funds, execute payouts, or claim fake on-chain settlement.

## Active Areas

- `contracts/lexnet_commerce_core.py` - GenLayer Intelligent Contract boundary for commerce cases, evidence, verification, recommendations, and trust passports.
- `frontend/src/lib/lexnet-*.ts` - core commerce domain types, pure domain logic, verification adapters, contract readiness, service reads, and client fallback storage.
- `frontend/src/lib/genlayer-*.ts` - narrow GenLayer SDK/execution adapters. App code should use this boundary instead of SDK internals.
- `frontend/src/lib/platform/` - filesystem-backed platform store, passports, API helpers, demo auth, readiness, backups, seed data, and pilot summaries.
- `frontend/src/components/` - dashboard, case detail, intake, passport, contract readiness, wallet status, sidebar, and shared UI components.
- `frontend/src/app/` - App Router pages and API routes.
- `frontend/src/providers/` - Web3/RainbowKit provider gate.
- `frontend/scripts/` - demo seed/reset/dev/backup/restore, GenLayer readiness, pilot check, and pilot prepare scripts.
- `frontend/tests/` - active domain and platform tests.

## Main Routes

- `/` - backend-aware commerce trust dashboard.
- `/cases/new` - case intake.
- `/cases/[id]` - case detail, evidence, verification, and recommendations.
- `/passports` - operator trust passport records and publishing controls.
- `/passport/[slug]` - public privacy-safe trust passport page.
- `/api/*` - demo-private platform routes, public passport lookup, guarded GenLayer routes, and security status.

## Commands

Run from the repo root:

```bash
npm --prefix frontend run dev
npm --prefix frontend run test:platform
npm --prefix frontend run test:domain
npm --prefix frontend exec tsc -- --noEmit
npm --prefix frontend run build
```

The demo dev server uses port `3002`.

## Storage And Env

- Backend demo state lives in `.lexnet-data/store.json`; do not commit `.lexnet-data/`.
- Browser `localStorage` remains a local fallback/cache for demo-created cases.
- Public config uses `NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS`, `NEXT_PUBLIC_GENLAYER_RPC_URL`, `NEXT_PUBLIC_GENLAYER_NETWORK_LABEL`, and `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`.
- Demo-private APIs use `LEXNET_RUNTIME_MODE`, `LEXNET_ENABLE_DEMO_PRIVATE_API`, optional `LEXNET_DEMO_PRIVATE_API_TOKEN`, and header `x-lexnet-operator-id: operator-demo`.

## Read Only By Explicit Request

- `genlayer-js/` - vendored SDK package source.
- `docs/superpowers/` - historical agent plans/specs.
- `docs/archive/` - old specs and roadmaps.
- `.claude/`, `.agent/`, `.shared/` - agent tooling, caches, and duplicated worktrees.
- `frontend/package-lock.json`, `genlayer-js/package-lock.json`, `genlayer-js/*.tgz` - large dependency artifacts.
