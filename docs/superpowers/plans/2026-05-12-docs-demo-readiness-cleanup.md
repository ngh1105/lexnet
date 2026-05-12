# Documentation and Demo Readiness Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update LexNet documentation and repository state so they accurately reflect the completed backend-backed Production Backbone.

**Architecture:** This is a docs-and-cleanup pass only. It updates orientation docs to describe the current Next.js App Router app, platform filesystem store, demo-private APIs, public passport publishing, verification commands, and local data boundaries without changing runtime behavior. The accidental root `package-lock.json` is removed only after confirming the real lockfile is `frontend/package-lock.json`.

**Tech Stack:** Markdown documentation, Git, Next.js 16 frontend, TypeScript, Node test runner via `tsx --test`, CodeRabbit via WSL when needed.

---

## File Structure

- Modify: `docs/CURRENT_MAP.md` — quick orientation map for active source files, routes, APIs, storage, commands, and deprecated paths.
- Modify: `ARCHITECTURE.md` — system architecture narrative for domain layer, platform backend layer, API routes, public passport privacy, and GenLayer readiness boundary.
- Modify: `README.md` — practical setup, environment, demo, verification, and local data notes.
- Remove if confirmed redundant: `package-lock.json` at repository/worktree root — accidental untracked lockfile that causes Next.js multiple-lockfile warnings.
- Keep unchanged: `frontend/package-lock.json`, `.env.local`, `genlayer-js/`, runtime source files.

---

### Task 1: Update Current Project Map

**Files:**
- Modify: `docs/CURRENT_MAP.md`

- [ ] **Step 1: Replace the stale current map content**

Rewrite `docs/CURRENT_MAP.md` to this content:

```markdown
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
- `frontend/src/components/Sidebar.tsx` — navigation shell.

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
```

- [ ] **Step 2: Verify stale storage language is gone**

Run:

```powershell
git -C "E:\Dapp\LexNet\.claude\worktrees\production-backbone" diff -- docs/CURRENT_MAP.md
```

Expected: the diff removes the old “Browser localStorage” primary storage statement and adds platform backend/API route sections.

- [ ] **Step 3: Commit current map update**

Run:

```powershell
git -C "E:\Dapp\LexNet\.claude\worktrees\production-backbone" add docs/CURRENT_MAP.md
git -C "E:\Dapp\LexNet\.claude\worktrees\production-backbone" commit -m @'
docs: update current project map for backend mode

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
'@
```

Expected: commit succeeds and stages only `docs/CURRENT_MAP.md`.

---

### Task 2: Update Architecture and README

**Files:**
- Modify: `ARCHITECTURE.md`
- Modify: `README.md`

- [ ] **Step 1: Replace `ARCHITECTURE.md` with current architecture**

Rewrite `ARCHITECTURE.md` to this content:

```markdown
# LexNet — System Architecture

> **Protocol:** GenLayer (AI-Native Trust Layer)
> **Contract:** Python (GenVM)
> **Updated:** 2026-05-12

## Overview

LexNet is an AI-verified commerce trust platform. It turns commercial agreements into verifiable case files, evaluates delivery evidence, produces settlement recommendations, and publishes privacy-safe trust passports.

The current product foundation is backend-backed for demo/pilot workflows, but it remains recommendation-only. It does not custody funds, execute payouts, or fake on-chain settlement.

## Architecture Layers

```text
Next.js App Router UI
  → Platform API routes and server-rendered pages
  → Platform backend layer (.lexnet-data/store.json)
  → LexNet domain/service layer (pure commerce logic + safe fallbacks)
  → Verification adapter (local deterministic / GenLayer-ready facade)
  → LexNetCommerceCore Intelligent Contract boundary
  → GenLayer consensus when real network integration is configured
```

## Contract: LexNetCommerceCore

Located at `contracts/lexnet_commerce_core.py`. The contract models commerce cases, evidence, AI verification, and recommendation output. It is recommendation-only and does not custody or transfer funds.

### State Machine

```text
DRAFT → ACTIVE → EVIDENCE_SUBMITTED → UNDER_AI_REVIEW → VERIFIED
                                                   ├→ REVISION_REQUESTED
                                                   ├→ DISPUTED
                                                   └→ SETTLEMENT_RECOMMENDED
```

### Key Methods

- `create_case(title, seller, agreement_text, acceptance_criteria_json, amount_reference)` — buyer creates a case.
- `submit_evidence(case_id, evidence_json)` — seller submits delivery URLs.
- `verify_case(case_id)` — triggers AI verification at the contract boundary.
- `get_case(case_id)` / `list_case_ids()` — read methods.

### Verification Output

```json
{
  "verdict": "APPROVE|REVISE|REJECT|SPLIT_RECOMMENDED",
  "score": 0,
  "summary": "...",
  "recommendation": "...",
  "seller_share_bps": 0,
  "reviewed_at": "block_number"
}
```

## Frontend Domain Layer

The domain layer lives under `frontend/src/lib/lexnet-*.ts`.

- `lexnet-types.ts` defines commerce case, evidence, report, and passport types.
- `lexnet-domain.ts` contains pure functions for case creation, evidence packs, stats, timelines, and trust passport scoring.
- `lexnet-verification.ts` defines verification adapters and deterministic scoring.
- `lexnet-contract.ts` reads public env config and exposes guarded GenLayer payload previews.
- `lexnet-service.ts` provides seed cases, runtime mode, and backend-aware case loading.
- `lexnet-client-store.ts` preserves browser localStorage fallback/cache behavior for local demo cases.

## Platform Backend Layer

The platform layer lives under `frontend/src/lib/platform/`.

- `types.ts` defines backend records: workspace, operator, membership, queue item, published passport, audit event, and platform summary.
- `store.ts` manages `.lexnet-data/store.json`, safe initialization, validation, serialized mutations, dashboard DTOs, passport DTOs, and audit append behavior.
- `passports.ts` generates private passport records, derives stable subject keys, builds privacy-safe public passport views, and hides unpublished passports.
- `api.ts` centralizes JSON responses, request parsing, security status, and lightweight rate limiting.
- `auth.ts` implements demo-private operator authorization using `LEXNET_ENABLE_DEMO_PRIVATE_API=true` and `x-lexnet-operator-id: operator-demo`.

The filesystem store is the backend source of truth for platform mode. Browser localStorage is not the platform source of truth; it remains a local fallback/cache for demo-created browser state.

## Routes

| Path | Purpose |
|------|---------|
| `/` | Backend-aware trust dashboard with platform summary and operator queue |
| `/cases/new` | New commerce case intake |
| `/cases/[id]` | Case detail, evidence, verification, and recommendations |
| `/passports` | Operator trust passport records and publishing controls |
| `/passport/[slug]` | Public privacy-safe trust passport page |

## API Routes

| Path | Access | Purpose |
|------|--------|---------|
| `/api/workspaces` | Demo-private | Workspace and membership summary |
| `/api/operators` | Demo-private | Operator summary |
| `/api/queue` | Demo-private | Review queue summary |
| `/api/passports` | Demo-private | Generate passport records and toggle publishing |
| `/api/passports/public/[slug]` | Public | Privacy-safe public passport JSON |
| `/api/admin/backup` | Demo-private | Backup/export summary with audit event |
| `/api/security/status` | Public status | Environment and platform readiness summary |

## Public Passport Privacy Boundary

Public passport views include only privacy-safe aggregate fields:

- Redacted subject.
- Role.
- Trust level.
- Average score.
- Verified/total case counts.
- Referenced value band.
- Risk labels.
- Published and updated timestamps.
- Public slug.

Public views do not expose raw wallet addresses, raw party identifiers, evidence URLs, case IDs, audit events, operator records, workspace memberships, or unpublished passport records.

## GenLayer Boundary

The UI may show contract readiness, blocking reasons, and guarded payload previews. It must not claim live on-chain execution unless a real network integration proves it. The current MVP remains recommendation-only and safe for demos.

## Production Boundary

Before using LexNet for production commerce workflows, add and review:

- Durable database storage or managed persistence.
- Production authentication and authorization.
- Evidence storage policy.
- Real GenLayer network integration tests.
- Deployment and backup operations.
- Security review for all mutating routes.
- Payment/settlement implementation only if the product scope explicitly adds custody or transfer paths.
```

- [ ] **Step 2: Replace `README.md` with current practical guide**

Rewrite `README.md` to this content:

```markdown
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
```

- [ ] **Step 3: Verify docs no longer describe localStorage as primary storage**

Run:

```powershell
git -C "E:\Dapp\LexNet\.claude\worktrees\production-backbone" diff -- ARCHITECTURE.md README.md
```

Expected: the diff replaces stale “Local state” and “Browser localStorage” primary-storage wording with backend platform store documentation.

- [ ] **Step 4: Commit architecture and README update**

Run:

```powershell
git -C "E:\Dapp\LexNet\.claude\worktrees\production-backbone" add ARCHITECTURE.md README.md
git -C "E:\Dapp\LexNet\.claude\worktrees\production-backbone" commit -m @'
docs: document production backbone architecture

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
'@
```

Expected: commit succeeds and stages only `ARCHITECTURE.md` and `README.md`.

---

### Task 3: Remove Accidental Root Lockfile and Verify

**Files:**
- Remove: `package-lock.json` at `E:\Dapp\LexNet\.claude\worktrees\production-backbone\package-lock.json`, only if still untracked.
- Keep: `frontend/package-lock.json`

- [ ] **Step 1: Confirm lockfile state**

Run:

```powershell
git -C "E:\Dapp\LexNet\.claude\worktrees\production-backbone" status --short -- package-lock.json frontend/package-lock.json
```

Expected:

```text
?? package-lock.json
```

There should be no modification to `frontend/package-lock.json`.

- [ ] **Step 2: Remove only the accidental root lockfile**

Run:

```powershell
Remove-Item "E:\Dapp\LexNet\.claude\worktrees\production-backbone\package-lock.json" -Confirm:$false
```

Expected: the root `package-lock.json` is removed. Do not remove `frontend/package-lock.json`.

- [ ] **Step 3: Verify status after cleanup**

Run:

```powershell
git -C "E:\Dapp\LexNet\.claude\worktrees\production-backbone" status --short
```

Expected: only documentation changes from prior tasks should be committed, and no `?? package-lock.json` should remain.

- [ ] **Step 4: Run final verification commands**

Run:

```powershell
npm --prefix "E:\Dapp\LexNet\.claude\worktrees\production-backbone\frontend" run test:platform
npm --prefix "E:\Dapp\LexNet\.claude\worktrees\production-backbone\frontend" run test:domain
npm --prefix "E:\Dapp\LexNet\.claude\worktrees\production-backbone\frontend" exec tsc -- --noEmit
npm --prefix "E:\Dapp\LexNet\.claude\worktrees\production-backbone\frontend" run build
```

Expected:

- Platform tests pass.
- Domain tests pass.
- TypeScript check exits 0.
- Build exits 0.
- Build output no longer warns about multiple lockfiles caused by the root `package-lock.json`.

- [ ] **Step 5: Commit cleanup if needed**

If removing the untracked root lockfile leaves no tracked file changes, no commit is needed for this step. If any tracked cleanup file was changed, commit only those tracked files.

Run final status:

```powershell
git -C "E:\Dapp\LexNet\.claude\worktrees\production-backbone" status --short
```

Expected: clean status.

---

## Self-Review Notes

- Spec coverage: Current map, architecture, README, root lockfile cleanup, and verification are covered.
- Runtime changes: none planned.
- Secrets: `.env.local`, private keys, `.lexnet-data/`, and `genlayer-js/` are explicitly untouched.
- Validation: includes tests, typecheck, build, and status checks.
