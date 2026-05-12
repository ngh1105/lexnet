# LexNet

LexNet is an AI-verified commerce trust platform for agreements, delivery evidence, verification reports, settlement recommendations, and portable trust passports.

The current MVP is recommendation-only. It does not custody funds, execute payouts, move real value, or claim fake on-chain settlement.

## Core Loop

Create commerce case → Submit delivery evidence → Run AI verification → Produce settlement recommendation → Update or publish trust passport.

## Current Product Foundation

- **Contract boundary:** `contracts/lexnet_commerce_core.py` models the GenLayer commerce verification boundary.
- **Frontend:** `frontend/src/app/` uses the Next.js App Router.
- **Domain logic:** `frontend/src/lib/lexnet-*.ts` contains pure commerce, evidence, verification, and passport logic.
- **Platform backend:** `frontend/src/lib/platform/` persists backend records to `.lexnet-data/store.json` and exposes safe DTO helpers.
- **API routes:** `frontend/src/app/api/` exposes demo-private workspace/operator/queue/passport/backup routes and public passport/status routes.
- **UI:** `frontend/src/components/` contains dashboard, case, evidence, verification, wallet, and passport components.

## Routes

- `/` — backend-aware commerce trust dashboard.
- `/cases/new` — create a commerce case.
- `/cases/[id]` — review a case, submit evidence, run verification, and view recommendations.
- `/passports` — view trust passport records and publish/unpublish backend passports.
- `/passport/[slug]` — public privacy-safe passport page.

## Setup

```bash
cd frontend
npm install
npm run dev
```

The development server runs on port `3002`.

## Verification

From the repository/worktree root:

```bash
npm --prefix frontend run test:platform
npm --prefix frontend run test:domain
npm --prefix frontend exec tsc -- --noEmit
npm --prefix frontend run build
```

`npm run test:domain` runs `tests/*.test.ts`, so it includes platform tests as well as domain tests.

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
LEXNET_ENABLE_DEMO_PRIVATE_API=true
```

Demo-private API requests also require:

```http
x-lexnet-operator-id: operator-demo
```

Do not commit `.env.local` or private keys.

## Local Data

Backend platform data is stored locally at:

```text
.lexnet-data/store.json
```

This file is local demo/runtime state and should not be committed. It can contain persisted cases, workspace/operator records, review queue items, published passport records, and audit events.

Browser localStorage remains a local fallback/cache for client-created demo cases.

## Public Passport Publishing

Operators can generate backend passport records from persisted verified commerce history, publish or unpublish a passport, and share `/passport/[slug]`.

The public passport page is privacy-safe. It exposes redacted subject data and aggregate trust metrics only. It does not expose raw parties, evidence URLs, case IDs, audit events, operator records, workspace membership data, or unpublished passports.

## Production Boundary

Before production use, LexNet still needs production authentication, managed persistence, deployment/backup operations, evidence policy, real GenLayer integration tests, and security review. Payment custody or settlement transfer paths are out of scope until explicitly designed and audited.

## License

See repository and subfolders for license information.
