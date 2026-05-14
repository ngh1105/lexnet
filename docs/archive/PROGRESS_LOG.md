# LexNet Task Progress Log

Last updated: 2026-05-11

## Completed

### Task 01: Contract-Backed Core — partial implementation against existing contract
- Confirmed the contract already exists at `contracts/lexnet_escrow.py`.
- Did not create a new contract because project instruction said the contract is already available.
- Added frontend runtime mode indicator for local/backend/contract mode.
- Improved GenLayer contract-mode error handling so contract failures do not silently fall back.
- Added Python lifecycle tests for the existing escrow contract behavior.
- Verified lifecycle tests pass with `py tests/test_escrow_lifecycle.py`.

### Task 02: Platform Backend and Persistence — initial backend mode implemented
- Added Next.js route-handler backend mode.
- Added durable filesystem JSON persistence under `.lexnet-data/store.json` at runtime.
- Added backend schemas for workspaces, users, cases, evidence, reports, audit events, and passports.
- Added API endpoints:
  - `GET /api/cases`
  - `POST /api/cases`
  - `GET /api/cases/[id]`
  - `PATCH /api/cases/[id]`
  - `POST /api/cases/[id]/evidence`
  - `POST /api/cases/[id]/verify`
  - `GET /api/cases/[id]/report`
- Added frontend data-mode switching with `NEXT_PUBLIC_LEXNET_DATA_MODE=backend`.
- Verified TypeScript passes with `npx tsc --noEmit`.
- Verified Next.js build passes with `npx next build`.

## In Progress

All tracked tasks are complete for demo/backend mode.

## Completed

### Task 04: AI Verification and Report Export
- Added report schema fields for `schemaVersion`, review/export status, evidence checksums, reviewer notes, and exported timestamp.
- Added verification started/completed/failed audit events and reset-to-submitted retry behavior for backend verification failures.
- Added JSON download and printable HTML export through `GET /api/cases/[id]/report?format=download|print`.
- Added report review updates through `PATCH /api/cases/[id]/report`.
- Added frontend report card with review status, mark-reviewed action, JSON download, and printable report links.
- Added platform tests for report review/export metadata.
- Verified with `npm run test:platform`, `npx tsc --noEmit`, and `npx next build`.

### Task 05: Workspace, Auth, and Operator Workflows
- Added workspace membership, invitation, assignment, and queue schemas.
- Added workspace, operator, and queue API routes with audit events.
- Added demo operator account generation backed by `genlayer-js` `createAccount()`.

### Task 06: Trust Passport and Public Sharing
- Added deterministic trust passport model with score breakdown, public slug, source report IDs, and privacy-safe redaction.
- Added passport generation/list API and public filtered passport lookup.
- Added public `/passport/[slug]` page.

### Task 07: Security, Compliance, Reliability, and CI/CD
- Added security status API with env validation metadata and testnet payment flag visibility.
- Added store backup API and backup metadata tracking.
- Added GitHub Actions workflow for Python lifecycle tests, platform tests, TypeScript, and Next build.

### Task 08: Payment and Escrow Readiness
- Added testnet payment readiness flag exposure through security status API.
- Added local demo account generation using `genlayer-js` account APIs while storing only address and private-key reference metadata.
- Preserved wallet-based browser flows and backend/demo persistence separation.

### Task 09: Pilot Launch and Commercial Packaging
- Added demo seed script that persists realistic workspace, case, evidence, report, passport, queue, analytics, audit, and generated account data to `.lexnet-data/store.json`.
- Added admin summary API with action counts, store checksum, and demo account metadata.
- Verified seeded demo data in backend mode.

### Task 03: Evidence Storage and Audit Trail

### Task 03: Evidence Storage and Audit Trail
- Added client-side artifact helpers in `frontend/src/lib/backend-client.ts`.
- Backend creates evidence records, checksums, URL normalization, dedupe, and audit events.
- Added evidence timeline and audit trail visibility on `frontend/src/app/escrow/[id]/page.tsx`.
- Added Node tests for duplicate evidence, checksum stability, URL normalization, and audit event creation in `frontend/src/lib/platform/store.test.mjs`.
- Verified with `node --test src/lib/platform/store.test.mjs`, `npx tsc --noEmit`, and `npx next build`.

## Validation Completed

```bash
py tests/test_escrow_lifecycle.py
npm run test:platform
npm run seed:demo
npx tsc --noEmit
npx next build
```

## Next Phase

- See `docs/LEXNET_NEXT_PHASE.md` for the recommended development sequence after the completed demo/backend baseline.
- Immediate next item: review and harden the demo baseline before replacing demo persistence or running live testnet flows.

## Notes

- Existing `contracts/lexnet_escrow.py` remains the contract source; no replacement contract was added.
- `frontend/test-write.ts` had a pre-existing type error and was fixed by using `TransactionStatus.FINALIZED`.
- All progress-log tasks are complete for demo/backend mode as of 2026-05-11.
