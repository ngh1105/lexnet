# Production Backbone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a backend-backed platform layer for durable LexNet cases, reports, passports, workspace/operator queues, audit events, public passport publishing, backup, and security status.

**Architecture:** Keep the current Next.js App Router app and add a focused platform layer under `frontend/src/lib/platform/`. The platform layer uses `.lexnet-data/store.json` as the backend-mode source of truth, while existing browser `localStorage` remains a local fallback. API routes call shared platform helpers, append audit events, and expose only privacy-safe public passport data.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Node `fs/promises`, Node test runner via `tsx --test`, existing LexNet domain helpers.

---

## File Structure

Create:

- `frontend/src/lib/platform/types.ts` — platform data model for workspace, operators, queue, published passports, audit, and store summary.
- `frontend/src/lib/platform/store.ts` — filesystem JSON store, default seed, read/write/mutate helpers, audit append, backup payload.
- `frontend/src/lib/platform/passports.ts` — generate deterministic passport records, slug generation, public redaction helpers.
- `frontend/src/lib/platform/auth.ts` — demo operator helper used by API routes; not production OAuth.
- `frontend/src/lib/platform/api.ts` — JSON responses, request parsing, env/security status, in-memory rate limiter.
- `frontend/tests/platform.test.ts` — platform unit tests.
- `frontend/src/app/api/workspaces/route.ts` — workspace summary API.
- `frontend/src/app/api/operators/route.ts` — operators/memberships API.
- `frontend/src/app/api/queue/route.ts` — review queue API.
- `frontend/src/app/api/passports/route.ts` — passport list/generate/publish API.
- `frontend/src/app/api/passports/public/[slug]/route.ts` — privacy-safe public passport API.
- `frontend/src/app/api/admin/backup/route.ts` — store backup/export API.
- `frontend/src/app/api/security/status/route.ts` — env and platform status API.
- `frontend/src/app/passport/[slug]/page.tsx` — public passport page.
- `frontend/src/components/PublicPassportClient.tsx` — public passport view.

Modify:

- `frontend/package.json` — add `test:platform` and include it in `verify:mvp`.
- `frontend/src/lib/lexnet-service.ts` — read backend persisted cases merged with current seed cases.
- `frontend/src/components/CommerceDashboardClient.tsx` — add optional backend summary/queue cards.
- `frontend/src/components/TrustPassportsClient.tsx` — add publish state and public link preview props.
- `frontend/src/app/page.tsx` — pass backend summary/queue state to dashboard.
- `frontend/src/app/passports/page.tsx` — pass published passport metadata.
- `frontend/src/app/globals.css` — add small public passport and backend summary styles only if needed.

## Task 1: Platform Types and Store Tests

**Files:**
- Create: `frontend/src/lib/platform/types.ts`
- Create: `frontend/src/lib/platform/store.ts`
- Create: `frontend/tests/platform.test.ts`
- Modify: `frontend/package.json`

- [ ] **Step 1: Add platform test script**

Update `frontend/package.json` scripts to include:

```json
{
  "test:domain": "tsx --test tests/*.test.ts",
  "test:platform": "tsx --test tests/platform.test.ts",
  "verify:mvp": "npm run test:domain && npm run test:platform && npm run build"
}
```

Keep existing scripts unchanged except for adding `test:platform` and expanding `verify:mvp`.

- [ ] **Step 2: Write failing store tests**

Create `frontend/tests/platform.test.ts` with:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  appendAuditEvent,
  createDefaultPlatformStore,
  readPlatformStore,
  writePlatformStore,
} from "../src/lib/platform/store";

async function withTempStore(run: (storePath: string) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), "lexnet-platform-"));
  try {
    await run(join(dir, "store.json"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("createDefaultPlatformStore includes demo workspace, operator, queue, and audit arrays", () => {
  const store = createDefaultPlatformStore();

  assert.equal(store.version, 1);
  assert.equal(store.workspaces.length, 1);
  assert.equal(store.operators.length, 1);
  assert.equal(store.memberships.length, 1);
  assert.equal(Array.isArray(store.queue), true);
  assert.equal(Array.isArray(store.auditEvents), true);
});

test("readPlatformStore creates a persisted default store when missing", async () => {
  await withTempStore(async (storePath) => {
    const store = await readPlatformStore(storePath);
    const raw = await readFile(storePath, "utf8");

    assert.equal(store.version, 1);
    assert.equal(JSON.parse(raw).version, 1);
  });
});

test("writePlatformStore persists platform data", async () => {
  await withTempStore(async (storePath) => {
    const store = createDefaultPlatformStore();
    store.workspaces[0].name = "Pilot Workspace";

    await writePlatformStore(store, storePath);
    const reloaded = await readPlatformStore(storePath);

    assert.equal(reloaded.workspaces[0]?.name, "Pilot Workspace");
  });
});

test("appendAuditEvent records operational metadata", async () => {
  await withTempStore(async (storePath) => {
    const event = await appendAuditEvent(
      {
        type: "case.created",
        actorId: "operator-demo",
        entityType: "case",
        entityId: "lx-case-test",
        detail: "Created test case",
      },
      storePath,
      "2026-05-12T12:00:00.000Z",
    );
    const store = await readPlatformStore(storePath);

    assert.equal(event.id, "audit-20260512120000000-case-created");
    assert.equal(store.auditEvents.length, 1);
    assert.equal(store.auditEvents[0]?.type, "case.created");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run from `frontend`:

```bash
npm run test:platform
```

Expected: FAIL because `../src/lib/platform/store` does not exist.

- [ ] **Step 4: Create platform types**

Create `frontend/src/lib/platform/types.ts`:

```ts
import type { CommerceCase, TrustPassportRole, TrustPassportLevel } from "@/lib/lexnet-types";

export type PlatformAuditType =
  | "case.created"
  | "evidence.submitted"
  | "verification.generated"
  | "passport.generated"
  | "passport.published"
  | "passport.unpublished"
  | "backup.exported";

export type PlatformEntityType = "case" | "evidence" | "report" | "passport" | "workspace" | "backup";

export interface PlatformWorkspace {
  id: string;
  name: string;
  createdAt: string;
}

export interface PlatformOperator {
  id: string;
  name: string;
  walletAddress: string;
  createdAt: string;
}

export interface PlatformMembership {
  id: string;
  workspaceId: string;
  operatorId: string;
  role: "owner" | "reviewer";
  createdAt: string;
}

export interface PlatformQueueItem {
  id: string;
  workspaceId: string;
  caseId: string;
  status: "open" | "assigned" | "resolved";
  priority: "normal" | "high";
  assignedOperatorId: string | null;
  reason: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublishedPassport {
  id: string;
  workspaceId: string;
  slug: string;
  party: string;
  redactedSubject: string;
  role: TrustPassportRole;
  trustLevel: TrustPassportLevel;
  averageScore: number;
  totalCases: number;
  verifiedCases: number;
  totalReferencedValue: number;
  sourceReportCount: number;
  riskFlags: string[];
  published: boolean;
  publishedAt: string | null;
  updatedAt: string;
}

export interface PublicPassportView {
  slug: string;
  redactedSubject: string;
  role: TrustPassportRole;
  trustLevel: TrustPassportLevel;
  averageScore: number;
  totalCases: number;
  verifiedCases: number;
  valueBand: string;
  sourceReportCount: number;
  riskFlags: string[];
  publishedAt: string;
}

export interface PlatformAuditEvent {
  id: string;
  type: PlatformAuditType;
  actorId: string;
  entityType: PlatformEntityType;
  entityId: string;
  detail: string;
  createdAt: string;
}

export interface PlatformStore {
  version: 1;
  cases: CommerceCase[];
  workspaces: PlatformWorkspace[];
  operators: PlatformOperator[];
  memberships: PlatformMembership[];
  queue: PlatformQueueItem[];
  passports: PublishedPassport[];
  auditEvents: PlatformAuditEvent[];
  updatedAt: string;
}

export interface PlatformSummary {
  persistedCases: number;
  reports: number;
  passports: number;
  publishedPassports: number;
  queueItems: number;
  auditEvents: number;
}
```

- [ ] **Step 5: Create store implementation**

Create `frontend/src/lib/platform/store.ts`:

```ts
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type {
  PlatformAuditEvent,
  PlatformAuditType,
  PlatformEntityType,
  PlatformStore,
  PlatformSummary,
} from "./types";

export const DEFAULT_PLATFORM_STORE_PATH = join(process.cwd(), "..", ".lexnet-data", "store.json");

const DEFAULT_CREATED_AT = "2026-05-12T00:00:00.000Z";

export interface AppendAuditInput {
  type: PlatformAuditType;
  actorId: string;
  entityType: PlatformEntityType;
  entityId: string;
  detail: string;
}

export function createDefaultPlatformStore(now = DEFAULT_CREATED_AT): PlatformStore {
  return {
    version: 1,
    cases: [],
    workspaces: [
      {
        id: "workspace-demo",
        name: "LexNet Pilot Workspace",
        createdAt: now,
      },
    ],
    operators: [
      {
        id: "operator-demo",
        name: "LexNet Demo Operator",
        walletAddress: "0x0000000000000000000000000000000000000000",
        createdAt: now,
      },
    ],
    memberships: [
      {
        id: "membership-demo-owner",
        workspaceId: "workspace-demo",
        operatorId: "operator-demo",
        role: "owner",
        createdAt: now,
      },
    ],
    queue: [],
    passports: [],
    auditEvents: [],
    updatedAt: now,
  };
}

export async function readPlatformStore(storePath = DEFAULT_PLATFORM_STORE_PATH): Promise<PlatformStore> {
  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw);
    if (isPlatformStore(parsed)) {
      return parsed;
    }
  } catch {
  }

  const store = createDefaultPlatformStore(new Date().toISOString());
  await writePlatformStore(store, storePath);
  return store;
}

export async function writePlatformStore(store: PlatformStore, storePath = DEFAULT_PLATFORM_STORE_PATH): Promise<void> {
  await mkdir(dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export async function mutatePlatformStore(
  mutate: (store: PlatformStore) => void,
  storePath = DEFAULT_PLATFORM_STORE_PATH,
): Promise<PlatformStore> {
  const store = await readPlatformStore(storePath);
  mutate(store);
  store.updatedAt = new Date().toISOString();
  await writePlatformStore(store, storePath);
  return store;
}

export async function appendAuditEvent(
  input: AppendAuditInput,
  storePath = DEFAULT_PLATFORM_STORE_PATH,
  createdAt = new Date().toISOString(),
): Promise<PlatformAuditEvent> {
  const event: PlatformAuditEvent = {
    id: buildAuditId(createdAt, input.type),
    ...input,
    createdAt,
  };

  await mutatePlatformStore((store) => {
    store.auditEvents.push(event);
  }, storePath);

  return event;
}

export function buildPlatformSummary(store: PlatformStore): PlatformSummary {
  return {
    persistedCases: store.cases.length,
    reports: store.cases.filter((commerceCase) => commerceCase.verificationReport).length,
    passports: store.passports.length,
    publishedPassports: store.passports.filter((passport) => passport.published).length,
    queueItems: store.queue.length,
    auditEvents: store.auditEvents.length,
  };
}

function buildAuditId(createdAt: string, type: string): string {
  return `audit-${createdAt.replace(/\D/g, "")}-${type.replaceAll(".", "-")}`;
}

function isPlatformStore(value: unknown): value is PlatformStore {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<PlatformStore>;
  return (
    candidate.version === 1 &&
    Array.isArray(candidate.cases) &&
    Array.isArray(candidate.workspaces) &&
    Array.isArray(candidate.operators) &&
    Array.isArray(candidate.memberships) &&
    Array.isArray(candidate.queue) &&
    Array.isArray(candidate.passports) &&
    Array.isArray(candidate.auditEvents) &&
    typeof candidate.updatedAt === "string"
  );
}
```

- [ ] **Step 6: Run platform tests**

Run from `frontend`:

```bash
npm run test:platform
```

Expected: PASS, 4 tests.

- [ ] **Step 7: Commit Task 1**

```bash
git add frontend/package.json frontend/src/lib/platform/types.ts frontend/src/lib/platform/store.ts frontend/tests/platform.test.ts
git commit -m "feat: add platform store foundation"
```

## Task 2: Passport Publishing and Privacy Tests

**Files:**
- Modify: `frontend/tests/platform.test.ts`
- Create: `frontend/src/lib/platform/passports.ts`

- [ ] **Step 1: Add failing passport tests**

Append to `frontend/tests/platform.test.ts`:

```ts
import {
  buildPublishedPassports,
  buildPublicPassportView,
  findPublicPassport,
} from "../src/lib/platform/passports";
import { createCommerceCase } from "../src/lib/lexnet-domain";
import type { CommerceCase } from "../src/lib/lexnet-types";

const reviewedCase: CommerceCase = {
  ...createCommerceCase(
    {
      title: "Reviewed platform case",
      buyer: "0x1111111111111111111111111111111111111111",
      seller: "0x2222222222222222222222222222222222222222",
      agreementText: "Agreement text long enough for public passport redaction tests",
      acceptanceCriteria: ["done"],
      amountReference: 5200,
    },
    { id: "lx-case-reviewed", createdAt: "2026-05-12T10:00:00.000Z" },
  ),
  status: "VERIFIED",
  verificationReport: {
    verdict: "APPROVE",
    score: 91,
    summary: "Complete",
    recommendation: "Release settlement recommendation",
    sellerShareBps: 10000,
    reviewedAt: "2026-05-12T11:00:00.000Z",
    riskFlags: [],
    source: "local",
  },
};

test("buildPublishedPassports creates deterministic private records", () => {
  const passports = buildPublishedPassports([reviewedCase], "workspace-demo", "2026-05-12T12:00:00.000Z");

  assert.equal(passports.length, 2);
  assert.equal(passports[0]?.workspaceId, "workspace-demo");
  assert.equal(passports[0]?.published, false);
  assert.match(passports[0]?.slug ?? "", /^buyer-0x1111-lexnet-[a-f0-9]{8}$/);
});

test("buildPublicPassportView redacts private subject and value", () => {
  const passport = buildPublishedPassports([reviewedCase], "workspace-demo", "2026-05-12T12:00:00.000Z")[0];
  assert.ok(passport);

  const publicView = buildPublicPassportView({
    ...passport,
    published: true,
    publishedAt: "2026-05-12T12:00:00.000Z",
  });

  assert.equal(publicView.redactedSubject.includes("111111111111111111111111"), false);
  assert.equal(publicView.valueBand, "$5k-$10k");
  assert.equal(publicView.publishedAt, "2026-05-12T12:00:00.000Z");
});

test("findPublicPassport only returns published privacy-safe view", () => {
  const privatePassport = buildPublishedPassports([reviewedCase], "workspace-demo", "2026-05-12T12:00:00.000Z")[0];
  assert.ok(privatePassport);

  assert.equal(findPublicPassport([privatePassport], privatePassport.slug), null);

  const publicView = findPublicPassport(
    [{ ...privatePassport, published: true, publishedAt: "2026-05-12T12:00:00.000Z" }],
    privatePassport.slug,
  );

  assert.equal(publicView?.slug, privatePassport.slug);
  assert.equal("party" in (publicView as object), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run test:platform
```

Expected: FAIL because `../src/lib/platform/passports` does not exist.

- [ ] **Step 3: Create passport helper**

Create `frontend/src/lib/platform/passports.ts`:

```ts
import { createHash } from "node:crypto";
import { buildTrustPassports } from "@/lib/lexnet-domain";
import type { CommerceCase, TrustPassport } from "@/lib/lexnet-types";
import type { PublishedPassport, PublicPassportView } from "./types";

export function buildPublishedPassports(
  cases: CommerceCase[],
  workspaceId: string,
  updatedAt = new Date().toISOString(),
): PublishedPassport[] {
  return buildTrustPassports(cases)
    .filter((passport) => passport.verifiedCases > 0)
    .map((passport) => toPublishedPassport(passport, workspaceId, updatedAt));
}

export function buildPublicPassportView(passport: PublishedPassport): PublicPassportView {
  if (!passport.published || !passport.publishedAt) {
    throw new Error("passport is not published");
  }

  return {
    slug: passport.slug,
    redactedSubject: passport.redactedSubject,
    role: passport.role,
    trustLevel: passport.trustLevel,
    averageScore: passport.averageScore,
    totalCases: passport.totalCases,
    verifiedCases: passport.verifiedCases,
    valueBand: getValueBand(passport.totalReferencedValue),
    sourceReportCount: passport.sourceReportCount,
    riskFlags: passport.riskFlags.slice(0, 3),
    publishedAt: passport.publishedAt,
  };
}

export function findPublicPassport(passports: PublishedPassport[], slug: string): PublicPassportView | null {
  const passport = passports.find((candidate) => candidate.slug === slug && candidate.published);
  if (!passport || !passport.publishedAt) {
    return null;
  }
  return buildPublicPassportView(passport);
}

function toPublishedPassport(passport: TrustPassport, workspaceId: string, updatedAt: string): PublishedPassport {
  const slug = buildSlug(passport);
  return {
    id: `passport-${slug}`,
    workspaceId,
    slug,
    party: passport.party,
    redactedSubject: redactSubject(passport.party),
    role: passport.role,
    trustLevel: passport.trustLevel,
    averageScore: passport.averageScore,
    totalCases: passport.totalCases,
    verifiedCases: passport.verifiedCases,
    totalReferencedValue: passport.totalReferencedValue,
    sourceReportCount: passport.verifiedCases,
    riskFlags: [...passport.riskFlags],
    published: false,
    publishedAt: null,
    updatedAt,
  };
}

function buildSlug(passport: TrustPassport): string {
  const digest = createHash("sha256")
    .update(`${passport.role}:${passport.party}`)
    .digest("hex")
    .slice(0, 8);
  return `${passport.role}-${passport.party.slice(0, 6).toLowerCase()}-lexnet-${digest}`;
}

function redactSubject(value: string): string {
  if (value.length <= 10) {
    return `${value.slice(0, 2)}...${value.slice(-2)}`;
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function getValueBand(value: number): string {
  if (value < 1000) return "<$1k";
  if (value < 5000) return "$1k-$5k";
  if (value < 10000) return "$5k-$10k";
  return "$10k+";
}
```

- [ ] **Step 4: Run platform tests**

Run:

```bash
npm run test:platform
```

Expected: PASS including passport privacy tests.

- [ ] **Step 5: Commit Task 2**

```bash
git add frontend/src/lib/platform/passports.ts frontend/tests/platform.test.ts
git commit -m "feat: add public passport publishing helpers"
```

## Task 3: API Helpers and Backend Routes

**Files:**
- Create: `frontend/src/lib/platform/api.ts`
- Create: `frontend/src/lib/platform/auth.ts`
- Create: `frontend/src/app/api/workspaces/route.ts`
- Create: `frontend/src/app/api/operators/route.ts`
- Create: `frontend/src/app/api/queue/route.ts`
- Create: `frontend/src/app/api/passports/route.ts`
- Create: `frontend/src/app/api/passports/public/[slug]/route.ts`
- Create: `frontend/src/app/api/admin/backup/route.ts`
- Create: `frontend/src/app/api/security/status/route.ts`
- Modify: `frontend/tests/platform.test.ts`

- [ ] **Step 1: Add API helper tests**

Append to `frontend/tests/platform.test.ts`:

```ts
import {
  buildSecurityStatus,
  checkRateLimit,
  resetRateLimitForTests,
} from "../src/lib/platform/api";

test("buildSecurityStatus reports configured and missing environment", () => {
  const status = buildSecurityStatus({
    NEXT_PUBLIC_GENLAYER_RPC_URL: "https://studio.genlayer.com/api",
    NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS: "",
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: "project-id",
  });

  assert.equal(status.genlayerRpcConfigured, true);
  assert.equal(status.contractAddressConfigured, false);
  assert.equal(status.walletConnectConfigured, true);
  assert.deepEqual(status.blockingReasons, ["Contract address is not configured."]);
});

test("checkRateLimit blocks after configured limit", () => {
  resetRateLimitForTests();

  assert.equal(checkRateLimit("case-create", 2).allowed, true);
  assert.equal(checkRateLimit("case-create", 2).allowed, true);
  assert.equal(checkRateLimit("case-create", 2).allowed, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run test:platform
```

Expected: FAIL because `../src/lib/platform/api` does not exist.

- [ ] **Step 3: Create API helper**

Create `frontend/src/lib/platform/api.ts`:

```ts
import { NextResponse } from "next/server";

export interface SecurityStatus {
  genlayerRpcConfigured: boolean;
  contractAddressConfigured: boolean;
  walletConnectConfigured: boolean;
  storeMode: "filesystem";
  blockingReasons: string[];
}

const rateLimitCounts = new Map<string, number>();

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function readJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export function checkRateLimit(key: string, limit = 20): { allowed: boolean; remaining: number } {
  const count = rateLimitCounts.get(key) ?? 0;
  if (count >= limit) {
    return { allowed: false, remaining: 0 };
  }
  rateLimitCounts.set(key, count + 1);
  return { allowed: true, remaining: limit - count - 1 };
}

export function resetRateLimitForTests() {
  rateLimitCounts.clear();
}

export function buildSecurityStatus(env: NodeJS.ProcessEnv): SecurityStatus {
  const blockingReasons: string[] = [];
  const genlayerRpcConfigured = Boolean(env.NEXT_PUBLIC_GENLAYER_RPC_URL?.trim());
  const contractAddressConfigured = Boolean(env.NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS?.trim());
  const walletConnectConfigured = Boolean(env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim());

  if (!genlayerRpcConfigured) blockingReasons.push("GenLayer RPC URL is not configured.");
  if (!contractAddressConfigured) blockingReasons.push("Contract address is not configured.");
  if (!walletConnectConfigured) blockingReasons.push("WalletConnect project ID is not configured.");

  return {
    genlayerRpcConfigured,
    contractAddressConfigured,
    walletConnectConfigured,
    storeMode: "filesystem",
    blockingReasons,
  };
}
```

- [ ] **Step 4: Create auth helper**

Create `frontend/src/lib/platform/auth.ts`:

```ts
import type { PlatformOperator, PlatformStore } from "./types";

export const DEMO_OPERATOR_ID = "operator-demo";

export function getDemoOperator(store: PlatformStore): PlatformOperator {
  return store.operators.find((operator) => operator.id === DEMO_OPERATOR_ID) ?? store.operators[0];
}
```

- [ ] **Step 5: Create read-only platform routes**

Create `frontend/src/app/api/workspaces/route.ts`:

```ts
import { jsonOk } from "@/lib/platform/api";
import { buildPlatformSummary, readPlatformStore } from "@/lib/platform/store";

export async function GET() {
  const store = await readPlatformStore();
  return jsonOk({ workspaces: store.workspaces, memberships: store.memberships, summary: buildPlatformSummary(store) });
}
```

Create `frontend/src/app/api/operators/route.ts`:

```ts
import { jsonOk } from "@/lib/platform/api";
import { readPlatformStore } from "@/lib/platform/store";

export async function GET() {
  const store = await readPlatformStore();
  return jsonOk({ operators: store.operators, memberships: store.memberships });
}
```

Create `frontend/src/app/api/queue/route.ts`:

```ts
import { jsonOk } from "@/lib/platform/api";
import { readPlatformStore } from "@/lib/platform/store";

export async function GET() {
  const store = await readPlatformStore();
  return jsonOk({ queue: store.queue });
}
```

Create `frontend/src/app/api/security/status/route.ts`:

```ts
import { buildSecurityStatus, jsonOk } from "@/lib/platform/api";
import { buildPlatformSummary, readPlatformStore } from "@/lib/platform/store";

export async function GET() {
  const store = await readPlatformStore();
  return jsonOk({ security: buildSecurityStatus(process.env), summary: buildPlatformSummary(store) });
}
```

- [ ] **Step 6: Create backup route**

Create `frontend/src/app/api/admin/backup/route.ts`:

```ts
import { appendAuditEvent, readPlatformStore } from "@/lib/platform/store";
import { getDemoOperator } from "@/lib/platform/auth";
import { jsonOk } from "@/lib/platform/api";

export async function GET() {
  const store = await readPlatformStore();
  const operator = getDemoOperator(store);
  await appendAuditEvent({
    type: "backup.exported",
    actorId: operator.id,
    entityType: "backup",
    entityId: "platform-store",
    detail: "Exported platform store backup",
  });

  return jsonOk({ exportedAt: new Date().toISOString(), store });
}
```

- [ ] **Step 7: Create passport API routes**

Create `frontend/src/app/api/passports/route.ts`:

```ts
import { readJsonBody, checkRateLimit, jsonError, jsonOk } from "@/lib/platform/api";
import { getDemoOperator } from "@/lib/platform/auth";
import { buildPublishedPassports } from "@/lib/platform/passports";
import { appendAuditEvent, mutatePlatformStore, readPlatformStore } from "@/lib/platform/store";

interface PublishBody {
  slug?: string;
  published?: boolean;
}

export async function GET() {
  const store = await readPlatformStore();
  return jsonOk({ passports: store.passports });
}

export async function POST() {
  const rate = checkRateLimit("passports-generate", 10);
  if (!rate.allowed) return jsonError("Rate limit exceeded.", 429);

  const store = await mutatePlatformStore((draft) => {
    const generated = buildPublishedPassports(draft.cases, "workspace-demo");
    const bySlug = new Map(draft.passports.map((passport) => [passport.slug, passport]));
    for (const passport of generated) {
      const existing = bySlug.get(passport.slug);
      bySlug.set(passport.slug, existing ? { ...passport, published: existing.published, publishedAt: existing.publishedAt } : passport);
    }
    draft.passports = Array.from(bySlug.values());
  });

  const operator = getDemoOperator(store);
  await appendAuditEvent({
    type: "passport.generated",
    actorId: operator.id,
    entityType: "passport",
    entityId: "generated-passports",
    detail: "Generated trust passports from persisted cases",
  });

  return jsonOk({ passports: store.passports });
}

export async function PATCH(request: Request) {
  const body = await readJsonBody<PublishBody>(request);
  if (!body?.slug || typeof body.published !== "boolean") return jsonError("slug and published are required.");

  const rate = checkRateLimit(`passport-publish:${body.slug}`, 10);
  if (!rate.allowed) return jsonError("Rate limit exceeded.", 429);

  const store = await mutatePlatformStore((draft) => {
    const passport = draft.passports.find((candidate) => candidate.slug === body.slug);
    if (!passport) return;
    passport.published = body.published;
    passport.publishedAt = body.published ? new Date().toISOString() : null;
    passport.updatedAt = new Date().toISOString();
  });

  const passport = store.passports.find((candidate) => candidate.slug === body.slug);
  if (!passport) return jsonError("Passport not found.", 404);

  const operator = getDemoOperator(store);
  await appendAuditEvent({
    type: body.published ? "passport.published" : "passport.unpublished",
    actorId: operator.id,
    entityType: "passport",
    entityId: body.slug,
    detail: body.published ? "Published trust passport" : "Unpublished trust passport",
  });

  return jsonOk({ passport });
}
```

Create `frontend/src/app/api/passports/public/[slug]/route.ts`:

```ts
import { jsonError, jsonOk } from "@/lib/platform/api";
import { findPublicPassport } from "@/lib/platform/passports";
import { readPlatformStore } from "@/lib/platform/store";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await readPlatformStore();
  const passport = findPublicPassport(store.passports, slug);
  if (!passport) return jsonError("Public passport not found.", 404);
  return jsonOk({ passport });
}
```

- [ ] **Step 8: Run platform tests**

Run:

```bash
npm run test:platform
```

Expected: PASS.

- [ ] **Step 9: Commit Task 3**

```bash
git add frontend/src/lib/platform/api.ts frontend/src/lib/platform/auth.ts frontend/src/app/api frontend/tests/platform.test.ts
git commit -m "feat: add platform API routes"
```

## Task 4: Backend Store Integration with Existing Case Flow

**Files:**
- Modify: `frontend/src/lib/platform/store.ts`
- Modify: `frontend/src/lib/lexnet-service.ts`
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/components/CommerceDashboardClient.tsx`

- [ ] **Step 1: Extend store helper to merge seed cases**

Add to `frontend/src/lib/platform/store.ts`:

```ts
import type { CommerceCase } from "@/lib/lexnet-types";

export async function getPlatformCommerceCases(seedCases: CommerceCase[]): Promise<CommerceCase[]> {
  const store = await readPlatformStore();
  const byId = new Map<string, CommerceCase>();
  for (const commerceCase of seedCases) byId.set(commerceCase.id, commerceCase);
  for (const commerceCase of store.cases) byId.set(commerceCase.id, commerceCase);
  return Array.from(byId.values()).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}
```

If the file already imports `CommerceCase`, merge imports instead of duplicating.

- [ ] **Step 2: Update service to use platform cases**

Modify `frontend/src/lib/lexnet-service.ts`:

```ts
import { getPlatformCommerceCases } from "./platform/store";
```

Replace `getAllCommerceCases` and `getCommerceCase` with:

```ts
export async function getAllCommerceCases(): Promise<CommerceCase[]> {
  return getPlatformCommerceCases(CASES);
}

export async function getCommerceCase(caseId: string): Promise<CommerceCase | null> {
  const cases = await getAllCommerceCases();
  return cases.find((commerceCase) => commerceCase.id === caseId) ?? null;
}
```

- [ ] **Step 3: Pass backend summary to dashboard**

Modify `frontend/src/app/page.tsx`:

```ts
import { buildPlatformSummary, readPlatformStore } from "@/lib/platform/store";
```

Inside `DashboardPage` before return:

```ts
const platformStore = await readPlatformStore();
const platformSummary = buildPlatformSummary(platformStore);
const queueItems = platformStore.queue;
```

Pass props:

```tsx
<CommerceDashboardClient
  seedCases={cases}
  runtimeMode={runtimeMode}
  contractEnvironment={contractEnvironment}
  platformSummary={platformSummary}
  queueItems={queueItems}
/>
```

- [ ] **Step 4: Render backend summary in dashboard**

Modify `frontend/src/components/CommerceDashboardClient.tsx` imports:

```ts
import type { PlatformQueueItem, PlatformSummary } from "@/lib/platform/types";
```

Extend props:

```ts
platformSummary?: PlatformSummary;
queueItems?: PlatformQueueItem[];
```

In the right rail before `EvidenceInspector` add:

```tsx
{platformSummary ? (
  <div className="panel" style={{ display: "grid", gap: 12 }}>
    <div className="section-label">Backend Store</div>
    <div className="inspector-list">
      <InspectorRow label="Persisted Cases" value={platformSummary.persistedCases.toString()} />
      <InspectorRow label="Reports" value={platformSummary.reports.toString()} />
      <InspectorRow label="Passports" value={platformSummary.passports.toString()} />
      <InspectorRow label="Audit Events" value={platformSummary.auditEvents.toString()} />
    </div>
  </div>
) : null}

{queueItems ? (
  <div className="panel" style={{ display: "grid", gap: 12 }}>
    <div className="section-label">Operator Queue</div>
    {queueItems.length > 0 ? (
      queueItems.slice(0, 3).map((item) => (
        <Link key={item.id} href={`/cases/${item.caseId}`} className="priority-card">
          <span>
            <strong>{item.caseId}</strong>
            <small>{item.reason}</small>
          </span>
          <ArrowRight size={14} strokeWidth={1.75} />
        </Link>
      ))
    ) : (
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>No backend queue items yet.</p>
    )}
  </div>
) : null}
```

- [ ] **Step 5: Run verification**

Run from `frontend`:

```bash
npm run test:platform
npm run test:domain
```

Expected: both PASS.

- [ ] **Step 6: Commit Task 4**

```bash
git add frontend/src/lib/platform/store.ts frontend/src/lib/lexnet-service.ts frontend/src/app/page.tsx frontend/src/components/CommerceDashboardClient.tsx
git commit -m "feat: surface backend platform summary"
```

## Task 5: Public Passport Page and Passport UI Publishing State

**Files:**
- Create: `frontend/src/components/PublicPassportClient.tsx`
- Create: `frontend/src/app/passport/[slug]/page.tsx`
- Modify: `frontend/src/app/passports/page.tsx`
- Modify: `frontend/src/components/TrustPassportsClient.tsx`

- [ ] **Step 1: Create public passport client**

Create `frontend/src/components/PublicPassportClient.tsx`:

```tsx
import { BadgeCheck, IdCard, ShieldAlert, ShieldCheck } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import type { PublicPassportView } from "@/lib/platform/types";

export default function PublicPassportClient({ passport }: { passport: PublicPassportView }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-shell">
        <div className="content-frame">
          <header className="topbar">
            <div>
              <div className="section-label"><IdCard size={14} strokeWidth={1.75} />Public Trust Passport</div>
              <h1 className="topbar-title">{passport.redactedSubject}</h1>
              <p className="topbar-subtitle">Privacy-safe trust history published by LexNet.</p>
            </div>
            <span className="status-chip success"><ShieldCheck size={13} strokeWidth={1.75} />Published</span>
          </header>

          <section className="metric-grid" style={{ marginBottom: 16 }}>
            <PublicMetric label="Trust Level" value={passport.trustLevel} icon={<BadgeCheck size={18} strokeWidth={1.75} />} />
            <PublicMetric label="Average Score" value={`${passport.averageScore}/100`} />
            <PublicMetric label="Verified Cases" value={`${passport.verifiedCases}/${passport.totalCases}`} />
            <PublicMetric label="Value Band" value={passport.valueBand} />
          </section>

          <section className="panel" style={{ display: "grid", gap: 12 }}>
            <div className="section-label"><ShieldAlert size={14} strokeWidth={1.75} />Risk Context</div>
            {passport.riskFlags.length > 0 ? (
              passport.riskFlags.map((flag) => <span key={flag} className="risk-chip">{flag}</span>)
            ) : (
              <span className="status-chip success">No public risk flags</span>
            )}
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              Source reports: {passport.sourceReportCount}. Published {passport.publishedAt.slice(0, 10)}.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

function PublicMetric({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}<span style={{ color: "var(--teal)" }}>{icon}</span></div>
      <div className="metric-value">{value}</div>
    </div>
  );
}
```

- [ ] **Step 2: Create public passport route page**

Create `frontend/src/app/passport/[slug]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import PublicPassportClient from "@/components/PublicPassportClient";
import { findPublicPassport } from "@/lib/platform/passports";
import { readPlatformStore } from "@/lib/platform/store";

export default async function PublicPassportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await readPlatformStore();
  const passport = findPublicPassport(store.passports, slug);

  if (!passport) {
    notFound();
  }

  return <PublicPassportClient passport={passport} />;
}
```

- [ ] **Step 3: Pass published passport metadata to passports page**

Modify `frontend/src/app/passports/page.tsx` to read platform store:

```ts
import { readPlatformStore } from "@/lib/platform/store";
```

Then pass:

```tsx
const platformStore = await readPlatformStore();
return <TrustPassportsClient seedCases={cases} publishedPassports={platformStore.passports} />;
```

- [ ] **Step 4: Show publish state in TrustPassportsClient**

Modify `frontend/src/components/TrustPassportsClient.tsx`:

```ts
import Link from "next/link";
import type { PublishedPassport } from "@/lib/platform/types";
```

Extend props:

```ts
publishedPassports?: PublishedPassport[];
```

Pass each card its published record:

```tsx
<PassportCard
  key={`${passport.role}:${passport.party}`}
  passport={passport}
  publishedPassport={publishedPassports?.find((item) => item.party === passport.party && item.role === passport.role)}
/>
```

Update card signature:

```ts
function PassportCard({ passport, publishedPassport }: { passport: TrustPassport; publishedPassport?: PublishedPassport }) {
```

Replace the current public preview message with:

```tsx
{publishedPassport?.published ? (
  <Link href={`/passport/${publishedPassport.slug}`} className="btn-secondary">
    Open public passport
  </Link>
) : (
  <div style={{ padding: 12, borderRadius: 8, border: "1px solid rgba(37,99,235,0.18)", background: "var(--blue-soft)", color: "var(--blue)", fontSize: 12, fontWeight: 800 }}>
    Generate and publish via /api/passports to enable the public preview.
  </div>
)}
```

- [ ] **Step 5: Run verification**

Run from `frontend`:

```bash
npm run test:platform
npm run test:domain
```

Expected: both PASS.

- [ ] **Step 6: Commit Task 5**

```bash
git add frontend/src/components/PublicPassportClient.tsx frontend/src/app/passport frontend/src/app/passports/page.tsx frontend/src/components/TrustPassportsClient.tsx
git commit -m "feat: add public trust passport page"
```

## Task 6: Final Verification, Build, and CodeRabbit

**Files:**
- Modify only if verification exposes real issues.

- [ ] **Step 1: Run platform tests**

Run from `frontend`:

```bash
npm run test:platform
```

Expected: PASS.

- [ ] **Step 2: Run domain tests**

Run from `frontend`:

```bash
npm run test:domain
```

Expected: PASS.

- [ ] **Step 3: Run TypeScript check**

Run from `frontend` on Windows:

```powershell
.\node_modules\.bin\tsc.cmd --noEmit -p .\tsconfig.json
```

Expected: exit code 0.

- [ ] **Step 4: Run production build**

Run from `frontend`:

```bash
npm run build
```

Expected: `Compiled successfully`.

- [ ] **Step 5: Run CodeRabbit on committed changes**

Run from repo root using WSL:

```bash
wsl bash -lc 'cd /mnt/e/Dapp/LexNet && /root/.local/bin/coderabbit review --agent -t committed --base-commit 28b6b97'
```

Expected: `findings: 0`, or only findings outside the production backbone commits that are explicitly skipped.

- [ ] **Step 6: Commit fixes if needed**

If verification finds issues, fix only the failing issue, rerun the relevant command, then commit:

```bash
git add <changed-files>
git commit -m "fix: stabilize production backbone"
```

- [ ] **Step 7: Report completion evidence**

Report exact results for:

- `npm run test:platform`
- `npm run test:domain`
- `tsc --noEmit`
- `npm run build`
- CodeRabbit committed review
- `git status --short`

## Self-Review

Spec coverage:

- Server-side persistence: Tasks 1 and 4.
- Workspace/operator/queue primitives: Tasks 1, 3, and 4.
- Public trust passport publishing: Tasks 2, 3, and 5.
- Audit metadata: Tasks 1 and 3.
- Backup/export: Task 3.
- Env validation/API helpers/rate limiting: Task 3.
- UI backend indicators: Tasks 4 and 5.
- Verification and CodeRabbit: Task 6.

Placeholder scan:

- No `TBD`, `TODO`, or vague implementation-only steps remain.
- All code-creating steps include concrete code blocks.

Type consistency:

- `PublishedPassport`, `PublicPassportView`, `PlatformStore`, and `PlatformSummary` are defined in Task 1 and reused consistently.
- API routes use helper names defined in Task 3.
- UI props use `PlatformSummary`, `PlatformQueueItem`, and `PublishedPassport` from `@/lib/platform/types`.
