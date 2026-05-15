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

## Demo Seed

From the repository/worktree root:

```bash
npm --prefix frontend run demo:seed
npm --prefix frontend run demo:reset
```

`demo:seed` writes deterministic full command-center demo data to `.lexnet-data/store.json`, including cases, evidence, local verification reports, queue items, operators, passports, and audit events.

`demo:reset` removes only `.lexnet-data/store.json`.

Seeded verification reports are local recommendations only. They do not claim funds moved or that an on-chain settlement succeeded.

Do not commit `.lexnet-data/`.

## Recommended Demo Workflow

From the repository/worktree root:

```bash
npm --prefix frontend run demo:seed
npm --prefix frontend run demo:dev
```

Open the URL printed by `demo:dev`. It prefers `http://localhost:3002` and falls back to `http://localhost:3003` if another checkout is already using port `3002`.

After the demo:

```bash
npm --prefix frontend run demo:backup
npm --prefix frontend run demo:reset
```

Use `demo:backup` before resetting when you want to keep a local snapshot of `.lexnet-data/store.json`. Backups remain local under `.lexnet-data/` and must not be committed.

## Demo Readiness Workflow

For a controlled local demo package:

```bash
npm --prefix frontend run pilot:prepare
npm --prefix frontend run pilot:check
```

`pilot:prepare` resets and reseeds local `.lexnet-data/store.json` with deterministic demo records and refuses to run in `LEXNET_RUNTIME_MODE=production`. The script name is kept for compatibility with the existing readiness test suite.

`pilot:check` reports runtime mode, auth readiness, persistence readiness, evidence policy readiness, GenLayer state verification readiness, local store counts, and forbidden secret-like keys. It fails only for production-mode blockers or forbidden secret-like keys.

See `docs/PILOT_RUNBOOK.md` for the full local demo runbook.

## Hackathon Submission Notes

- Run `npm --prefix frontend run demo:seed` and `npm --prefix frontend run demo:dev`, then open the printed local URL.
- The demo story is case intake, evidence review, local AI recommendation, guarded GenLayer submission/read-back, operator queue, and privacy-safe trust passport publishing.
- Generated GenLayer demo accounts live only in ignored local data files. Do not commit `.lexnet-data/`, `.env.local`, generated private keys, or demo secrets.
- LexNet is not production custody, payment release, or dispute-finality infrastructure. It demonstrates a verification and recommendation workflow with explicit proof boundaries.
- `npm audit --omit=dev` is expected to report zero known production vulnerabilities after the current lockfile patch. Re-run it before submission because wallet/SDK transitive packages can change quickly.

## Environment Variables

Public frontend configuration:

```bash
NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS=
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_GENLAYER_NETWORK_LABEL=Studionet
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

Demo-private and production boundary configuration:

```bash
LEXNET_ENABLE_DEMO_PRIVATE_API=true
LEXNET_DEMO_PRIVATE_API_TOKEN=
LEXNET_PRODUCTION_AUTH_MODE=off
LEXNET_PRODUCTION_AUTH_SECRET=
LEXNET_PRODUCTION_AUTH_CLOCK_SKEW_SECONDS=60
```

Demo-private API requests also require:

```http
x-lexnet-operator-id: operator-demo
```

If `LEXNET_DEMO_PRIVATE_API_TOKEN` is set, demo-private API requests must also include `Authorization: Bearer <token>`. Leave it blank for local-only demos.

`LEXNET_PRODUCTION_AUTH_MODE` is `off` outside production and `trusted-header` when an upstream gateway signs production mutations. In trusted-header mode, `LEXNET_PRODUCTION_AUTH_SECRET` must be a strong random secret, for example `openssl rand -hex 32`, and must never be empty in production. `LEXNET_PRODUCTION_AUTH_CLOCK_SKEW_SECONDS` controls the allowed timestamp drift for signed headers; the default is 60 seconds.

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

## GenLayer SDK Boundary

LexNet uses `genlayer-js` only behind the local `genlayer-client` adapter. The guarded `verify_case` path may submit a real SDK call when contract address, RPC URL, wallet/operator readiness, and demo-private authorization all pass.

A GenLayer transaction hash is submission evidence only. LexNet marks a GenLayer verification as contract-state verified only after reading `get_case(case_id)` and finding a `verification_report` in the contract state.

Local verification remains the fallback. The UI must not claim settlement completion, fund movement, or on-chain finality unless a real SDK result and later contract-state verification prove it.

## Production Boundary

Current hardening status:

- Demo-private APIs can require both `x-lexnet-operator-id: operator-demo` and an optional `Authorization: Bearer <token>` header.
- Production mode now requires enforced production auth, such as the trusted-header HMAC boundary; provider/env naming alone is not enough.
- Filesystem persistence is local demo infrastructure, not a managed production database.
- Backup/restore commands are local operational tools, not a managed disaster recovery system.
- The guarded GenLayer SDK path can submit `verify_case` through `genlayer-js` only when readiness checks pass, and it does not claim settlement finality.

Before production use, LexNet still needs a real managed DB adapter, deployment observability, managed backups, audited GenLayer transaction execution/state verification, and security review. Payment custody or settlement transfer paths remain out of scope until explicitly designed and audited.

## License

See repository and subfolders for license information.
