# Next-Session Follow-ups

> Pending work after MVP + review fixes + HMAC + vercel.json (all merged to main on 2026-05-18).
> Use Sonnet 4.6 for next session — Opus is overkill for these.

---

## Smoke test (do FIRST, before any of the below)

Manual, ~15 min, no agent needed:
1. `cd frontend && npm run dev`
2. Browser → http://localhost:3002
3. Connect MetaMask (account holding test funds on Studionet)
4. Open existing demo case → click "Submit verify_case"
5. Confirm: success message has `Transaction: 0x...`, then "Verifying on Studionet...", then "Verification complete"
6. Check on https://studio.genlayer.com/contracts/0x08a9897bbE5aEa24b41447f758FeD246035648B3 that case state changed

---

## Task 2: Vercel deploy

**Prereq:** `frontend/vercel.json` already committed. `frontend/.env.local` has Studionet contract address.

**Steps:**
1. `cd frontend`
2. `vercel link` (if not already linked — check `frontend/.vercel/`)
3. Set production env vars in Vercel dashboard or CLI:
   - `NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS=0x08a9897bbE5aEa24b41447f758FeD246035648B3`
   - `NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api`
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<project-id>`
   - For demo mode: `LEXNET_RUNTIME_MODE=local-demo`, `LEXNET_ENABLE_DEMO_PRIVATE_API=true`, `LEXNET_DEMO_PRIVATE_API_TOKEN=<token>`
   - For pilot/production: also set `LEXNET_PRODUCTION_AUTH_PROVIDER=trusted-header`, `LEXNET_PRODUCTION_AUTH_MODE=trusted-header`, `LEXNET_PRODUCTION_AUTH_SECRET=<32+ char>`
4. `vercel --prod`

**Watch:** middleware runs on Edge, requires `production-auth-edge.ts` (already in main). Build will fail if any non-Edge import sneaks in — check `npm run build` locally first.

**Owner:** ngh1105 (CLI auth required)

---

## Task 3: Postgres persistence

**Status:** Adapter shape exists at `frontend/src/lib/platform/persistence-adapter.ts`. Filesystem store still active in `frontend/src/lib/platform/store.ts`. Production mode currently fails closed because `managed-missing` mode rejects mutations.

**Decisions needed first (don't start until confirmed):**
1. **Provider:** Vercel Postgres / Supabase / Neon — affects connection pooling, edge compatibility, cost
2. **ORM:** Drizzle (lightweight, edge-friendly) / Prisma (full features, heavier) / raw `pg`
3. **Migration tool:** Drizzle Kit / Prisma Migrate / sqitch / hand-rolled

**Suggested default if no preference:** Vercel Postgres + Drizzle + Drizzle Kit.

**Schema must map these store collections** (see `frontend/src/lib/platform/types.ts`):
- `cases` (commerce cases with state machine)
- `workspaces`, `operators`, `memberships`
- `queueItems`
- `publishedPassports` (with stable subject keys)
- `auditEvents`
- `genLayerExecutions`

**Implementation outline (multi-day work):**
1. Brainstorm session — get user buy-in on provider/ORM
2. Schema design + migration files
3. Replace `readPlatformStore` and `mutatePlatformStore` with adapter pattern
4. Update all 12+ call sites in API routes
5. Backfill: one-shot import from `.lexnet-data/store.json` to DB
6. Switch readiness to require `LEXNET_MANAGED_PERSISTENCE_PROVIDER=postgres` + `LEXNET_MANAGED_DATABASE_URL`
7. Tests against in-memory pg (pg-mem) or testcontainers

**Estimated:** 2-3 days dev. Open a separate brainstorm session — do NOT inline this.

---

## Task 4: E2E Playwright

**Blockers:**
- Wallet flows (MetaMask connect, transaction signing) need wallet mock — `@synthetixio/synpress` is the established option but adds heavy setup
- Real GenLayer contract calls cost gas + change Studionet state → don't test against live; mock the genlayer-js SDK at network level
- Screenshot drift on Windows vs CI Linux

**Suggested scope (don't try to test everything):**
- Public passport view (`/passport/[slug]`) — no wallet needed, easy win
- Demo login flow → dashboard → new case form (no contract submit, just local create)
- Verify case button shows readiness gate when wallet disconnected (DOM check, no chain call)

**Skip in v1:**
- Wallet connect flow (synpress setup is its own project)
- Contract write smoke (manual test on Studionet is fine for hackathon)

**Files to create:**
- `frontend/playwright.config.ts`
- `frontend/e2e/public-passport.spec.ts`
- `frontend/e2e/demo-login.spec.ts`
- CI workflow if pushing — or run locally only

**Estimated:** 1 day dev. Lower priority than Postgres.

---

## Cost notes for next session

- Use Sonnet 4.6 (`claude --model claude-sonnet-4-6`) — Opus 4 burned ~$2K this session for largely mechanical work
- Plugins already trimmed in `~/.claude/settings.json` (5 active vs 15)
- For Task 3 (Postgres): start with brainstorming skill, NOT writing-plans — too many open decisions
- For Task 2 (Vercel): run commands manually, don't dispatch a subagent
- For Task 4 (E2E): start with one minimal spec to prove harness works, then expand

---

## Already done — reference (commit SHAs on main)

- `40741cd` — F1+F2+F3+F4 review fixes merged
- `0caad2b` — feat(security): Edge HMAC verification with replay protection
- `41d66b5` — chore(deploy): vercel.json with security headers + passport edge cache

Branches still present locally (can delete after merge confirmed):
`mvp/t1-verify-wire`, `mvp/t2-readback-polling`, `mvp/t3-create-case-write`, `mvp/t4-submit-evidence-write`, `mvp/t5-page-auth-gate`, `mvp/t6-admin-backup-hardening`, `fix/f1-submit-evidence-null-guard`, `fix/f2-f3-case-detail-fixes`, `fix/f4-genlayer-client-dry`, `feat/hmac-edge-verification`
