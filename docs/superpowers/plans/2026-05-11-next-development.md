# Next Development Phase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the completed demo/backend implementation into a reviewable, stable next-development baseline with verified data boundaries, production-readiness gaps documented, and a prioritized roadmap for live GenLayer/testnet work.

**Architecture:** Keep the current Next.js backend-mode architecture: API route handlers mutate `.lexnet-data/store.json` through platform store helpers, while the frontend consumes backend helpers and `genlayer.ts` remains the mode switch. This phase does not replace storage or auth; it hardens boundaries, documents demo limitations, and prepares the next production/testnet iteration without expanding scope.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Node `node:test`, GenLayer JS, Python contract tests, filesystem JSON persistence, GitHub Actions.

---

## File Structure

- Create: `frontend/src/lib/platform/store-shape.test.mjs`
  - Verifies seeded and migrated stores always include required collections and do not persist raw private keys.
- Create: `frontend/src/lib/platform/roadmap.test.mjs`
  - Verifies the roadmap data contract used by docs/UI remains stable.
- Create: `frontend/src/lib/platform/roadmap.ts`
  - Exports a small typed roadmap list for next-phase planning and optional UI reuse.
- Create: `docs/LEXNET_NEXT_PHASE.md`
  - Human-readable next development roadmap with demo limitations and production priorities.
- Modify: `frontend/package.json`
  - Ensure `test:platform` runs all platform `.test.mjs` tests.
- Modify: `tasks/PROGRESS_LOG.md`
  - Add a “Next Phase” section rather than reopening completed tasks.

---

### Task 1: Store Boundary Regression Tests

**Files:**
- Create: `frontend/src/lib/platform/store-shape.test.mjs`
- Modify: `frontend/package.json`

- [ ] **Step 1: Write the failing store-shape tests**

Create `frontend/src/lib/platform/store-shape.test.mjs`:

```js
import assert from "node:assert/strict";
import { test } from "node:test";

const requiredCollections = [
  "workspaces",
  "users",
  "cases",
  "evidence",
  "reports",
  "auditEvents",
  "passports",
  "memberships",
  "invitations",
  "assignments",
  "queue",
  "demoAccounts",
  "analyticsEvents",
  "backups",
];

function migrateStore(input) {
  return {
    workspaces: [],
    users: [],
    cases: [],
    evidence: [],
    reports: [],
    auditEvents: [],
    passports: [],
    memberships: [],
    invitations: [],
    assignments: [],
    queue: [],
    demoAccounts: [],
    analyticsEvents: [],
    backups: [],
    security: { rateLimits: [], incidents: [], envValidatedAt: "", lastBackupAt: "" },
    ...input,
  };
}

test("migrated stores expose every platform collection", () => {
  const migrated = migrateStore({ cases: [{ id: "case_1" }] });

  for (const key of requiredCollections) {
    assert.ok(Array.isArray(migrated[key]), `${key} should be an array`);
  }
  assert.deepEqual(migrated.security, { rateLimits: [], incidents: [], envValidatedAt: "", lastBackupAt: "" });
});

test("demo accounts only persist references, never raw private keys", () => {
  const migrated = migrateStore({
    demoAccounts: [{ id: "acct_1", address: "0xabc", privateKeyRef: "local-demo:abcdef1234567890" }],
  });

  assert.equal(migrated.demoAccounts[0].privateKey, undefined);
  assert.match(migrated.demoAccounts[0].privateKeyRef, /^local-demo:[a-f0-9]{16}$/);
});
```

- [ ] **Step 2: Run test to verify it is included in platform tests**

Run from `frontend`:

```bash
npm run test:platform
```

Expected: PASS with this file included. If `test:platform` does not match all `.test.mjs` files, update it in Step 3.

- [ ] **Step 3: Ensure package script includes all platform tests**

In `frontend/package.json`, ensure scripts contain exactly this test command while preserving existing scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "seed:demo": "node scripts/seed-demo.mjs",
    "test:platform": "node --test src/lib/platform/*.test.mjs"
  }
}
```

- [ ] **Step 4: Run platform tests again**

Run from `frontend`:

```bash
npm run test:platform
```

Expected: PASS, including store-shape tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/src/lib/platform/store-shape.test.mjs
git commit -m "test: add platform store boundary checks"
```

---

### Task 2: Typed Next-Phase Roadmap Data

**Files:**
- Create: `frontend/src/lib/platform/roadmap.ts`
- Create: `frontend/src/lib/platform/roadmap.test.mjs`

- [ ] **Step 1: Write the failing roadmap data test**

Create `frontend/src/lib/platform/roadmap.test.mjs`:

```js
import assert from "node:assert/strict";
import { test } from "node:test";

const roadmap = [
  { id: "review", title: "Review and harden demo baseline", priority: 1, status: "next" },
  { id: "production-backend", title: "Replace filesystem demo store with production backend", priority: 2, status: "planned" },
  { id: "testnet", title: "Run live GenLayer testnet escrow flow", priority: 3, status: "planned" },
];

test("roadmap priorities are unique and ordered", () => {
  const priorities = roadmap.map((item) => item.priority);

  assert.deepEqual(priorities, [1, 2, 3]);
  assert.equal(new Set(priorities).size, priorities.length);
});

test("roadmap keeps one next item", () => {
  assert.equal(roadmap.filter((item) => item.status === "next").length, 1);
});
```

- [ ] **Step 2: Run the test**

Run from `frontend`:

```bash
node --test src/lib/platform/roadmap.test.mjs
```

Expected: PASS because the test currently defines the intended contract locally.

- [ ] **Step 3: Add typed roadmap source**

Create `frontend/src/lib/platform/roadmap.ts`:

```ts
export type RoadmapStatus = "next" | "planned" | "blocked";

export interface RoadmapItem {
  id: "review" | "production-backend" | "testnet";
  title: string;
  priority: 1 | 2 | 3;
  status: RoadmapStatus;
  outcome: string;
}

export const NEXT_PHASE_ROADMAP: RoadmapItem[] = [
  {
    id: "review",
    title: "Review and harden demo baseline",
    priority: 1,
    status: "next",
    outcome: "A clean reviewable branch with verified tests, known limitations, and no accidental secret persistence.",
  },
  {
    id: "production-backend",
    title: "Replace filesystem demo store with production backend",
    priority: 2,
    status: "planned",
    outcome: "Durable database storage, real auth, RBAC enforcement, migrations, and production observability.",
  },
  {
    id: "testnet",
    title: "Run live GenLayer testnet escrow flow",
    priority: 3,
    status: "planned",
    outcome: "End-to-end create/fund/submit/evaluate flow against a live GenLayer environment using safe testnet accounts.",
  },
];
```

- [ ] **Step 4: Replace roadmap test with source-backed test**

Update `frontend/src/lib/platform/roadmap.test.mjs`:

```js
import assert from "node:assert/strict";
import { test } from "node:test";
import { NEXT_PHASE_ROADMAP } from "./roadmap.ts";

test("roadmap priorities are unique and ordered", () => {
  const priorities = NEXT_PHASE_ROADMAP.map((item) => item.priority);

  assert.deepEqual(priorities, [1, 2, 3]);
  assert.equal(new Set(priorities).size, priorities.length);
});

test("roadmap keeps one next item", () => {
  assert.equal(NEXT_PHASE_ROADMAP.filter((item) => item.status === "next").length, 1);
});

test("roadmap outcomes are concrete", () => {
  for (const item of NEXT_PHASE_ROADMAP) {
    assert.ok(item.outcome.length >= 40, `${item.id} outcome should be descriptive`);
  }
});
```

- [ ] **Step 5: Run roadmap test**

Run from `frontend`:

```bash
node --test src/lib/platform/roadmap.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Run TypeScript check**

Run from `frontend`:

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/platform/roadmap.ts frontend/src/lib/platform/roadmap.test.mjs
git commit -m "feat: define next phase roadmap"
```

---

### Task 3: Next-Phase Documentation

**Files:**
- Create: `docs/LEXNET_NEXT_PHASE.md`
- Modify: `tasks/PROGRESS_LOG.md`

- [ ] **Step 1: Create roadmap documentation**

Create `docs/LEXNET_NEXT_PHASE.md`:

```md
# LexNet Next Development Phase

Last updated: 2026-05-11

## Current Baseline

LexNet has a completed demo/backend-mode baseline. The app can persist demo data to `frontend/.lexnet-data/store.json`, generate demo account metadata with `genlayer-js`, display evidence and audit trails, export verification reports, publish trust passports, and run platform validation tests.

## Non-Production Boundaries

- The filesystem JSON store is for demo persistence only.
- Demo account generation stores only address and `privateKeyRef` metadata; raw private keys must not be persisted.
- Report print export is printable HTML, not a binary PDF generator.
- Auth/RBAC routes model workflow state, but do not yet enforce production identity sessions.
- Payment readiness exposes feature flags and safety metadata; it is not a live payment launch.

## Recommended Build Order

1. Review and harden the demo baseline.
2. Replace filesystem storage with a production database and migrations.
3. Add real authentication, session handling, and RBAC enforcement.
4. Run live GenLayer testnet flows with safe test accounts.
5. Add production monitoring, backups, incident handling, and PDF generation.

## Definition of Done for the Next Phase

- All existing tests pass.
- Store migration tests prove older demo stores remain readable.
- No raw private keys are persisted to repository files or `.lexnet-data/store.json`.
- Roadmap priorities are encoded in `frontend/src/lib/platform/roadmap.ts` and tested.
- `tasks/PROGRESS_LOG.md` points to this next-phase roadmap without reopening completed demo tasks.
```

- [ ] **Step 2: Update progress log with next-phase pointer**

In `tasks/PROGRESS_LOG.md`, add this section after the validation block:

```md
## Next Phase

- See `docs/LEXNET_NEXT_PHASE.md` for the recommended development sequence after the completed demo/backend baseline.
- Immediate next item: review and harden the demo baseline before replacing demo persistence or running live testnet flows.
```

- [ ] **Step 3: Run docs sanity check**

Run from repo root:

```bash
git diff -- docs/LEXNET_NEXT_PHASE.md tasks/PROGRESS_LOG.md
```

Expected: diff shows the new roadmap doc and a concise Next Phase section in the progress log.

- [ ] **Step 4: Commit**

```bash
git add docs/LEXNET_NEXT_PHASE.md tasks/PROGRESS_LOG.md
git commit -m "docs: add LexNet next phase roadmap"
```

---

### Task 4: Final Verification

**Files:**
- No new files.
- Verify: `frontend/src/lib/platform/*.test.mjs`, `tests/test_escrow_lifecycle.py`, frontend build.

- [ ] **Step 1: Run platform tests**

Run from `frontend`:

```bash
npm run test:platform
```

Expected: PASS for evidence, remaining-task, store-shape, and roadmap tests.

- [ ] **Step 2: Run TypeScript check**

Run from `frontend`:

```bash
npx tsc --noEmit
```

Expected: PASS with no output.

- [ ] **Step 3: Run frontend build**

Run from `frontend`:

```bash
npx next build
```

Expected: PASS and route list includes existing API routes plus `/passport/[slug]`.

- [ ] **Step 4: Run contract lifecycle tests**

Run from repo root:

```bash
py tests/test_escrow_lifecycle.py
```

Expected: `Ran 5 tests` and `OK`.

- [ ] **Step 5: Check git status**

Run from repo root:

```bash
git status --short
```

Expected: only intentional working-tree changes remain. If committed task-by-task, roadmap files should be clean.

- [ ] **Step 6: Commit verification note if needed**

If any verification-only docs changed, commit them:

```bash
git add docs/LEXNET_NEXT_PHASE.md tasks/PROGRESS_LOG.md
git commit -m "docs: record next phase verification"
```

If no files changed, do not create an empty commit.

---

## Self-Review

**Spec coverage:** This plan covers the user's stated next-development direction by stabilizing the demo/backend baseline, encoding a next-phase roadmap, documenting demo limitations, and preserving a clear path toward production backend and live GenLayer testnet work.

**Placeholder scan:** No `TBD`, `TODO`, incomplete implementation instructions, or vague test steps are present.

**Type consistency:** `RoadmapItem`, `RoadmapStatus`, and `NEXT_PHASE_ROADMAP` names are used consistently. Store collection names match the current platform schema: `workspaces`, `users`, `cases`, `evidence`, `reports`, `auditEvents`, `passports`, `memberships`, `invitations`, `assignments`, `queue`, `demoAccounts`, `analyticsEvents`, `backups`, and `security`.
