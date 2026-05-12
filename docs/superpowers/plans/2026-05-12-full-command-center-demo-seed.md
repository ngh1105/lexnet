# Full Command-Center Demo Seed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build deterministic demo seed/reset commands that populate `.lexnet-data/store.json` with a realistic backend-backed LexNet command-center story.

**Architecture:** Put reusable seed construction in a focused TypeScript module under `frontend/src/lib/platform/demo-seed.ts`, then call it from small scripts under `frontend/scripts/`. The seed module must use existing domain/platform helpers (`createCommerceCase`, `appendEvidenceToCase`, `applyVerificationReport`, `buildPublishedPassports`, `writePlatformStore`) instead of hand-written JSON snapshots.

**Tech Stack:** Next.js 16 App Router project, TypeScript, Node.js scripts run with `tsx`, Node test runner via `tsx --test`, filesystem JSON persistence at `.lexnet-data/store.json`.

---

## File Structure

- Create `frontend/src/lib/platform/demo-seed.ts` — pure deterministic seed builder plus write/reset helpers.
- Create `frontend/scripts/demo-seed.ts` — CLI entrypoint for `demo:seed`.
- Create `frontend/scripts/demo-reset.ts` — CLI entrypoint for `demo:reset`.
- Modify `frontend/package.json` — add `demo:seed` and `demo:reset` scripts.
- Modify `frontend/tests/platform.test.ts` — add seed validation tests.
- Modify `README.md` — document demo seed/reset commands.
- Modify `docs/CURRENT_MAP.md` — list active demo seed/reset scripts.

---

### Task 1: Add deterministic demo seed builder

**Files:**
- Create: `frontend/src/lib/platform/demo-seed.ts`
- Test: `frontend/tests/platform.test.ts`

- [ ] **Step 1: Add failing tests for seed shape and safety**

Append this import block to `frontend/tests/platform.test.ts` near the existing imports:

```ts
import {
  buildDemoPlatformStore,
  getDemoSeedPublicPassportSlugs,
} from "../src/lib/platform/demo-seed";
```

Append these tests after the existing platform store tests:

```ts
test("buildDemoPlatformStore creates a full command-center demo store", () => {
  const store = buildDemoPlatformStore();

  assert.equal(store.version, 1);
  assert.equal(store.workspaces.length, 1);
  assert.equal(store.workspaces[0]?.name, "LexNet Pilot Command Center");
  assert.equal(store.operators.length >= 2, true);
  assert.equal(store.operators.some((operator) => operator.id === "operator-demo"), true);
  assert.equal(store.memberships.length >= 2, true);
  assert.equal(store.cases.length >= 5, true);
  assert.equal(store.cases.length <= 7, true);
  assert.equal(store.queue.length >= 3, true);
  assert.equal(store.publishedPassports.length >= 2, true);
  assert.equal(store.auditEvents.length >= store.cases.length, true);

  const statuses = new Set(store.cases.map((commerceCase) => commerceCase.status));
  assert.equal(statuses.has("ACTIVE"), true);
  assert.equal(statuses.has("EVIDENCE_SUBMITTED"), true);
  assert.equal(statuses.has("UNDER_AI_REVIEW"), true);
  assert.equal(statuses.has("VERIFIED"), true);
  assert.equal(statuses.has("REVISION_REQUESTED"), true);
  assert.equal(statuses.has("SETTLEMENT_RECOMMENDED"), true);

  assert.equal(
    store.cases.some((commerceCase) => commerceCase.verificationReport?.source === "local"),
    true,
  );
  assert.equal(
    store.cases.every((commerceCase) => commerceCase.verificationReport?.source !== "genlayer-contract"),
    true,
  );
});

test("buildDemoPlatformStore publishes deterministic public passports", () => {
  const store = buildDemoPlatformStore();
  const publicSlugs = getDemoSeedPublicPassportSlugs(store).sort();

  assert.equal(publicSlugs.length >= 2, true);
  for (const slug of publicSlugs) {
    assert.notEqual(findPublicPassport(store.publishedPassports, slug), null);
  }
});

test("buildDemoPlatformStore does not seed private keys or fake on-chain claims", () => {
  const serialized = JSON.stringify(buildDemoPlatformStore()).toLowerCase();

  assert.equal(serialized.includes("privatekey"), false);
  assert.equal(serialized.includes("private_key"), false);
  assert.equal(serialized.includes("mnemonic"), false);
  assert.equal(serialized.includes("seed phrase"), false);
  assert.equal(serialized.includes("api token"), false);
  assert.equal(serialized.includes("on-chain settlement succeeded"), false);
  assert.equal(serialized.includes("funds moved"), false);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm --prefix frontend run test:platform
```

Expected: FAIL with module not found for `../src/lib/platform/demo-seed`.

- [ ] **Step 3: Implement seed builder**

Create `frontend/src/lib/platform/demo-seed.ts` with:

```ts
import { rm } from "node:fs/promises";

import {
  appendEvidenceToCase,
  applyVerificationReport,
  createCommerceCase,
} from "../lexnet-domain";
import type { CommerceCase, VerificationReport } from "../lexnet-types";
import { buildPublishedPassports } from "./passports";
import {
  DEFAULT_PLATFORM_STORE_PATH,
  writePlatformStore,
} from "./store";
import type { PlatformAuditEvent, PlatformStore } from "./types";

const WORKSPACE_ID = "workspace-demo";
const SEED_CREATED_AT = "2026-05-12T08:00:00.000Z";
const SEED_UPDATED_AT = "2026-05-12T12:00:00.000Z";


type DemoCaseInput = {
  id: string;
  title: string;
  buyer: string;
  seller: string;
  agreementText: string;
  acceptanceCriteria: string[];
  amountReference: number;
  createdAt: string;
  evidenceUrls: string[];
  status: CommerceCase["status"];
  report?: VerificationReport;
};

export function buildDemoPlatformStore(): PlatformStore {
  const cases = buildDemoCases();
  const passports = buildPublishedPassports(cases, WORKSPACE_ID, SEED_UPDATED_AT).map(
    (passport) => ({
      ...passport,
      publishedAt: shouldPublishDemoPassport(passport)
        ? "2026-05-12T12:05:00.000Z"
        : "",
      updatedAt: SEED_UPDATED_AT,
    }),
  );

  return {
    version: 1,
    workspaces: [
      {
        id: WORKSPACE_ID,
        name: "LexNet Pilot Command Center",
        slug: "pilot-command-center",
        createdAt: SEED_CREATED_AT,
        updatedAt: SEED_UPDATED_AT,
      },
    ],
    operators: [
      {
        id: "operator-demo",
        name: "Demo Operator",
        walletAddress: "0x0000000000000000000000000000000000000000",
        email: "operator@lexnet.local",
        createdAt: SEED_CREATED_AT,
        updatedAt: SEED_UPDATED_AT,
      },
      {
        id: "operator-review",
        name: "Review Specialist",
        walletAddress: "0x1111111111111111111111111111111111111111",
        email: "review@lexnet.local",
        createdAt: SEED_CREATED_AT,
        updatedAt: SEED_UPDATED_AT,
      },
    ],
    memberships: [
      {
        id: "membership-demo-owner",
        workspaceId: WORKSPACE_ID,
        operatorId: "operator-demo",
        role: "owner",
        createdAt: SEED_CREATED_AT,
      },
      {
        id: "membership-review-operator",
        workspaceId: WORKSPACE_ID,
        operatorId: "operator-review",
        role: "operator",
        createdAt: SEED_CREATED_AT,
      },
    ],
    queue: [
      {
        id: "queue-api-review",
        workspaceId: WORKSPACE_ID,
        caseId: "lx-demo-api-integration",
        status: "in_review",
        priority: "high",
        assignedOperatorId: "operator-review",
        createdAt: "2026-05-12T09:45:00.000Z",
        updatedAt: "2026-05-12T10:20:00.000Z",
      },
      {
        id: "queue-device-followup",
        workspaceId: WORKSPACE_ID,
        caseId: "lx-demo-device-shipment",
        status: "blocked",
        priority: "high",
        assignedOperatorId: "operator-demo",
        createdAt: "2026-05-12T10:40:00.000Z",
        updatedAt: "2026-05-12T11:15:00.000Z",
      },
      {
        id: "queue-marketplace-intake",
        workspaceId: WORKSPACE_ID,
        caseId: "lx-demo-marketplace-onboarding",
        status: "pending",
        priority: "normal",
        createdAt: "2026-05-12T11:20:00.000Z",
        updatedAt: "2026-05-12T11:20:00.000Z",
      },
    ],
    cases,
    publishedPassports: passports,
    auditEvents: buildDemoAuditEvents(cases, passports),
  };
}

export async function seedDemoPlatformStore(
  storePath = DEFAULT_PLATFORM_STORE_PATH,
): Promise<PlatformStore> {
  const store = buildDemoPlatformStore();
  await writePlatformStore(store, storePath);
  return store;
}

export async function resetDemoPlatformStore(
  storePath = DEFAULT_PLATFORM_STORE_PATH,
): Promise<void> {
  await rm(storePath, { force: true });
}

export function getDemoSeedPublicPassportSlugs(store = buildDemoPlatformStore()): string[] {
  return store.publishedPassports
    .filter((passport) => passport.publishedAt)
    .map((passport) => passport.slug)
    .sort();
}

function shouldPublishDemoPassport(passport: PlatformStore["publishedPassports"][number]): boolean {
  return (
    (passport.role === "buyer" && passport.party === "0x4F9A00000000000000000000000000000000B001") ||
    (passport.role === "seller" && passport.party === "0x7ED2000000000000000000000000000000005001")
  );
}

function buildDemoCases(): CommerceCase[] {
  return demoCaseInputs.map((input) => {
    const base = createCommerceCase(
      {
        title: input.title,
        buyer: input.buyer,
        seller: input.seller,
        agreementText: input.agreementText,
        acceptanceCriteria: input.acceptanceCriteria,
        amountReference: input.amountReference,
      },
      { id: input.id, createdAt: input.createdAt },
    );
    const withEvidence = appendEvidenceToCase(base, input.evidenceUrls);
    const withReport = input.report
      ? applyVerificationReport(withEvidence, input.report)
      : withEvidence;
    return { ...withReport, status: input.status };
  });
}

const demoCaseInputs: DemoCaseInput[] = [
  {
    id: "lx-demo-landing-page",
    title: "SaaS landing page launch delivery",
    buyer: "0x4F9A00000000000000000000000000000000B001",
    seller: "0x7ED2000000000000000000000000000000005001",
    agreementText:
      "Build and deliver a responsive SaaS landing page with a hero section, pricing cards, feature blocks, lead capture form, analytics wiring, and deployment handoff.",
    acceptanceCriteria: [
      "Page must render correctly on desktop and mobile breakpoints.",
      "Lead capture form must validate required fields.",
      "Delivery evidence must include deployed URL and source repository.",
    ],
    amountReference: 4200,
    createdAt: "2026-05-12T08:15:00.000Z",
    evidenceUrls: [
      "https://example.com/lexnet-demo/landing-page-live",
      "https://github.com/lexnet-demo/saas-landing-page",
      "https://docs.example.com/lexnet-demo/landing-page-handoff",
    ],
    status: "VERIFIED",
    report: localReport({
      verdict: "APPROVE",
      score: 92,
      recommendation: "Release the full recommended seller share. Delivery evidence satisfies the agreement and acceptance criteria.",
      sellerShareBps: 10000,
      reviewedAt: "2026-05-12T09:00:00.000Z",
    }),
  },
  {
    id: "lx-demo-api-integration",
    title: "Billing API integration dispute",
    buyer: "0x4F9A00000000000000000000000000000000B001",
    seller: "0x7ED2000000000000000000000000000000005002",
    agreementText:
      "Implement billing API integration with webhook retries, reconciliation logs, deployment notes, and a buyer engineering handoff for production readiness review.",
    acceptanceCriteria: [
      "Repository must include webhook retry implementation.",
      "Documentation must explain reconciliation and failure handling.",
      "Demo endpoint must reproduce the billing event flow.",
    ],
    amountReference: 8800,
    createdAt: "2026-05-12T08:40:00.000Z",
    evidenceUrls: [
      "https://github.com/lexnet-demo/billing-api-integration",
      "https://example.com/lexnet-demo/billing-api-demo",
      "https://docs.example.com/lexnet-demo/billing-api-runbook",
    ],
    status: "SETTLEMENT_RECOMMENDED",
    report: localReport({
      verdict: "SPLIT_RECOMMENDED",
      score: 76,
      recommendation: "Release 70% to the seller and hold 30% until retry logging and reconciliation evidence are completed.",
      sellerShareBps: 7000,
      reviewedAt: "2026-05-12T10:10:00.000Z",
      riskFlags: ["Incomplete retry evidence", "Reconciliation handoff gap"],
    }),
  },
  {
    id: "lx-demo-device-shipment",
    title: "IoT device shipment verification",
    buyer: "0x6CB100000000000000000000000000000000B003",
    seller: "0x7ED2000000000000000000000000000000005001",
    agreementText:
      "Ship configured IoT gateway devices with inventory manifest, carrier proof, activation logs, and acceptance checklist for a retail pilot deployment.",
    acceptanceCriteria: [
      "Carrier proof must match the device manifest.",
      "Activation logs must show successful boot for each gateway.",
      "Buyer acceptance checklist must identify any missing devices.",
    ],
    amountReference: 12400,
    createdAt: "2026-05-12T09:05:00.000Z",
    evidenceUrls: [
      "https://example.com/lexnet-demo/device-manifest",
      "https://docs.example.com/lexnet-demo/carrier-proof",
      "https://example.com/lexnet-demo/activation-logs",
    ],
    status: "REVISION_REQUESTED",
    report: localReport({
      verdict: "REVISE",
      score: 61,
      recommendation: "Request revised delivery evidence because two gateway activation logs are missing from the submitted package.",
      sellerShareBps: 5000,
      reviewedAt: "2026-05-12T10:45:00.000Z",
      riskFlags: ["Missing activation logs", "Manifest mismatch"],
    }),
  },
  {
    id: "lx-demo-design-kit",
    title: "Marketplace design system handoff",
    buyer: "0x8AA300000000000000000000000000000000B004",
    seller: "0x7ED2000000000000000000000000000000005001",
    agreementText:
      "Deliver marketplace design system assets, editable source files, component usage notes, and export-ready marketing templates for launch operations.",
    acceptanceCriteria: [
      "Editable source files must be accessible to the buyer team.",
      "Component notes must cover primary marketplace flows.",
      "Marketing templates must include launch-ready export formats.",
    ],
    amountReference: 6400,
    createdAt: "2026-05-12T09:30:00.000Z",
    evidenceUrls: [
      "https://example.com/lexnet-demo/design-system-preview",
      "https://docs.example.com/lexnet-demo/design-handoff",
    ],
    status: "VERIFIED",
    report: localReport({
      verdict: "APPROVE",
      score: 88,
      recommendation: "Release the full recommended seller share. Evidence shows source access and launch templates are complete.",
      sellerShareBps: 10000,
      reviewedAt: "2026-05-12T11:00:00.000Z",
    }),
  },
  {
    id: "lx-demo-marketplace-onboarding",
    title: "Vendor onboarding automation intake",
    buyer: "0x6CB100000000000000000000000000000000B003",
    seller: "0x2DC9000000000000000000000000000000005005",
    agreementText:
      "Build vendor onboarding automation with form validation, document collection, approval routing, and operational reporting for a marketplace pilot.",
    acceptanceCriteria: [
      "Workflow must collect required vendor documents.",
      "Approval routing must preserve review history.",
      "Reporting must summarize onboarding throughput.",
    ],
    amountReference: 7300,
    createdAt: "2026-05-12T10:20:00.000Z",
    evidenceUrls: [],
    status: "ACTIVE",
  },
  {
    id: "lx-demo-fulfillment-dashboard",
    title: "Fulfillment analytics dashboard evidence submitted",
    buyer: "0x4F9A00000000000000000000000000000000B001",
    seller: "0x2DC9000000000000000000000000000000005005",
    agreementText:
      "Deliver a fulfillment analytics dashboard with order aging, exception queues, carrier performance, and exported weekly operations reports.",
    acceptanceCriteria: [
      "Dashboard must include order aging and exception queue metrics.",
      "Carrier performance must be filterable by week.",
      "Exported reports must match the agreed weekly operations format.",
    ],
    amountReference: 9600,
    createdAt: "2026-05-12T10:55:00.000Z",
    evidenceUrls: [
      "https://example.com/lexnet-demo/fulfillment-dashboard",
      "https://docs.example.com/lexnet-demo/weekly-ops-report",
    ],
    status: "EVIDENCE_SUBMITTED",
  },
  {
    id: "lx-demo-compliance-review",
    title: "Compliance evidence review in progress",
    buyer: "0x8AA300000000000000000000000000000000B004",
    seller: "0x7ED2000000000000000000000000000000005002",
    agreementText:
      "Prepare compliance evidence package with policy mapping, signed attestation checklist, access review export, and remediation notes for audit readiness.",
    acceptanceCriteria: [
      "Policy mapping must reference each requested control.",
      "Access review export must include reviewer timestamps.",
      "Remediation notes must separate closed and open items.",
    ],
    amountReference: 11200,
    createdAt: "2026-05-12T11:35:00.000Z",
    evidenceUrls: [
      "https://docs.example.com/lexnet-demo/policy-mapping",
      "https://example.com/lexnet-demo/access-review-export",
    ],
    status: "UNDER_AI_REVIEW",
  },
];

function localReport(input: Omit<VerificationReport, "summary" | "source"> & { summary?: string }): VerificationReport {
  return {
    summary: input.summary ?? "Local deterministic LexNet review evaluated the submitted evidence against the agreement and acceptance criteria.",
    source: "local",
    ...input,
  };
}

function buildDemoAuditEvents(
  cases: CommerceCase[],
  passports: PlatformStore["publishedPassports"],
): PlatformAuditEvent[] {
  const events: PlatformAuditEvent[] = [];
  for (const commerceCase of cases) {
    events.push(audit("case.created", "case", commerceCase.id, `Created ${commerceCase.title}`, commerceCase.createdAt));
    if (commerceCase.evidence.length > 0) {
      events.push(audit("evidence.submitted", "evidence", commerceCase.id, `Submitted ${commerceCase.evidence.length} evidence items`, commerceCase.createdAt));
    }
    if (commerceCase.verificationReport) {
      events.push(audit("verification.generated", "report", commerceCase.id, `Generated ${commerceCase.verificationReport.verdict} verification recommendation`, commerceCase.verificationReport.reviewedAt));
    }
  }
  for (const passport of passports) {
    events.push(audit("passport.generated", "passport", passport.id, `Generated trust passport for ${passport.role}`, passport.updatedAt));
    if (passport.publishedAt) {
      events.push(audit("passport.published", "passport", passport.id, `Published public passport ${passport.slug}`, passport.publishedAt));
    }
  }
  return events;
}

function audit(
  type: PlatformAuditEvent["type"],
  entityType: PlatformAuditEvent["entityType"],
  entityId: string,
  detail: string,
  createdAt: string,
): PlatformAuditEvent {
  return {
    id: `audit-${createdAt.replace(/\D/g, "")}-${type.replace(/\./g, "-")}-${entityId}`,
    type,
    actorId: "operator-demo",
    entityType,
    entityId,
    detail,
    createdAt,
  };
}
```

- [ ] **Step 4: Run tests and adjust deterministic slugs if needed**

Run:

```bash
npm --prefix frontend run test:platform
```

Expected: PASS after the seed builder exists, with at least two deterministic public passport slugs returned by `getDemoSeedPublicPassportSlugs()`.

- [ ] **Step 5: Commit seed builder**

```bash
git add frontend/src/lib/platform/demo-seed.ts frontend/tests/platform.test.ts
git commit -m "feat: add deterministic demo platform seed"
```

---

### Task 2: Add demo seed and reset CLI commands

**Files:**
- Create: `frontend/scripts/demo-seed.ts`
- Create: `frontend/scripts/demo-reset.ts`
- Modify: `frontend/package.json`
- Test: `frontend/tests/platform.test.ts`

- [ ] **Step 1: Add failing package script assertions**

Append this import to `frontend/tests/platform.test.ts`:

```ts
import packageJson from "../package.json" with { type: "json" };
```

Append this test:

```ts
test("package scripts expose demo seed and reset commands", () => {
  assert.equal(packageJson.scripts["demo:seed"], "tsx scripts/demo-seed.ts");
  assert.equal(packageJson.scripts["demo:reset"], "tsx scripts/demo-reset.ts");
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm --prefix frontend run test:platform
```

Expected: FAIL because `demo:seed` and `demo:reset` scripts are missing.

- [ ] **Step 3: Create CLI scripts**

Create `frontend/scripts/demo-seed.ts`:

```ts
import { seedDemoPlatformStore } from "../src/lib/platform/demo-seed";

const store = await seedDemoPlatformStore();
const publicPassport = store.publishedPassports.find((passport) => passport.publishedAt);

console.log(`Seeded LexNet demo store with ${store.cases.length} cases, ${store.queue.length} queue items, and ${store.publishedPassports.length} passports.`);
if (publicPassport) {
  console.log(`Public passport: /passport/${publicPassport.slug}`);
}
```

Create `frontend/scripts/demo-reset.ts`:

```ts
import { resetDemoPlatformStore } from "../src/lib/platform/demo-seed";

await resetDemoPlatformStore();
console.log("Removed .lexnet-data/store.json");
```

- [ ] **Step 4: Add package scripts**

Modify `frontend/package.json` scripts to include:

```json
"demo:seed": "tsx scripts/demo-seed.ts",
"demo:reset": "tsx scripts/demo-reset.ts"
```

Keep existing scripts unchanged.

- [ ] **Step 5: Run tests**

Run:

```bash
npm --prefix frontend run test:platform
```

Expected: PASS.

- [ ] **Step 6: Run seed/reset commands manually**

Run:

```bash
npm --prefix frontend run demo:seed
npm --prefix frontend run demo:reset
```

Expected:

- `demo:seed` prints seeded counts and a public passport path.
- `demo:reset` prints `Removed .lexnet-data/store.json`.

- [ ] **Step 7: Commit CLI commands**

```bash
git add frontend/scripts/demo-seed.ts frontend/scripts/demo-reset.ts frontend/package.json frontend/tests/platform.test.ts
git commit -m "feat: add demo seed and reset commands"
```

---

### Task 3: Document demo commands

**Files:**
- Modify: `README.md`
- Modify: `docs/CURRENT_MAP.md`

- [ ] **Step 1: Update README demo section**

In `README.md`, add this section after `## Verification`:

```markdown
## Demo Seed

From the repository/worktree root:

```bash
npm --prefix frontend run demo:seed
npm --prefix frontend run demo:reset
```

`demo:seed` writes a deterministic full command-center demo to `.lexnet-data/store.json`, including cases, evidence, local verification reports, queue items, operators, passports, and audit events. `demo:reset` removes only `.lexnet-data/store.json`.

The seeded verification reports are local recommendations only. They do not claim funds moved or that an on-chain settlement succeeded. Do not commit `.lexnet-data/`.
```

- [ ] **Step 2: Update CURRENT_MAP commands**

In `docs/CURRENT_MAP.md`, add these commands to the core command block or additional active frontend scripts:

```bash
npm --prefix frontend run demo:seed
npm --prefix frontend run demo:reset
```

Also add `frontend/scripts/demo-seed.ts` and `frontend/scripts/demo-reset.ts` under active shell/providers/tests or a new scripts subsection:

```markdown
- `frontend/scripts/demo-seed.ts` — writes deterministic full command-center demo data to `.lexnet-data/store.json`.
- `frontend/scripts/demo-reset.ts` — removes only `.lexnet-data/store.json` for local demo reset.
```

- [ ] **Step 3: Run grep safety check**

Run:

```bash
git diff -- README.md docs/CURRENT_MAP.md
```

Expected: docs mention seed/reset, local recommendations only, and no fake on-chain settlement.

- [ ] **Step 4: Commit docs**

```bash
git add README.md docs/CURRENT_MAP.md
git commit -m "docs: document demo seed commands"
```

---

### Task 4: Final validation

**Files:**
- No source changes expected unless validation reveals an issue.

- [ ] **Step 1: Run seed command and verify store exists**

Run:

```bash
npm --prefix frontend run demo:seed
```

Expected: command exits 0 and prints seeded counts plus a `/passport/<slug>` path.

- [ ] **Step 2: Run platform tests**

Run:

```bash
npm --prefix frontend run test:platform
```

Expected: PASS.

- [ ] **Step 3: Run domain tests**

Run:

```bash
npm --prefix frontend run test:domain
```

Expected: PASS.

- [ ] **Step 4: Run TypeScript check**

Run:

```bash
npm --prefix frontend exec tsc -- --noEmit
```

Expected: exit 0.

- [ ] **Step 5: Run production build**

Run:

```bash
npm --prefix frontend run build
```

Expected: build succeeds.

- [ ] **Step 6: Reset generated local store**

Run:

```bash
npm --prefix frontend run demo:reset
```

Expected: `.lexnet-data/store.json` is removed.

- [ ] **Step 7: Verify git status**

Run:

```bash
git status --short
```

Expected: no `.lexnet-data/store.json`; only intentional committed changes should remain.

- [ ] **Step 8: If any validation fix was needed, commit it**

If Task 4 required code/doc changes, commit them with:

```bash
git add <changed files>
git commit -m "fix: stabilize demo seed validation"
```

If no changes were needed, do not create an empty commit.
