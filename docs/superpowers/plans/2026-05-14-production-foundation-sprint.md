# Production Foundation Sprint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make LexNet's platform foundation production-safe by enforcing real mutation authentication, introducing a managed persistence adapter boundary, adding audit/observability surfaces, and enforcing evidence retention policy without adding custody, payouts, escrow, settlement finality, or real value movement.

**Architecture:** Keep the existing filesystem store as the local-demo/pilot adapter and add a production adapter boundary that can be configured explicitly. Production mode must fail closed unless trusted-header auth is enforced, managed persistence is selected, audit events are emitted with production metadata, and evidence retention policy is configured and applied. Public passport views remain aggregate-only and must not expose raw evidence URLs, private case IDs, operators, memberships, audit events, workspace data, unpublished records, payout status, or settlement claims.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Node `tsx --test`, filesystem JSON pilot store, production trusted-header HMAC auth, environment-driven adapter selection.

---

## File Structure

- Modify: `frontend/src/lib/platform/types.ts`
  - Add production-safe audit event types for auth, persistence, observability, and evidence retention.
  - Add managed persistence metadata fields to the store types without changing public passport privacy.

- Modify: `frontend/src/lib/platform/store.ts`
  - Keep current filesystem implementation intact.
  - Add a `PlatformStoreRepository` interface and wrap existing read/write/mutate helpers behind a filesystem repository.
  - Add a managed repository selector that fails closed in production until a supported provider is configured.

- Modify: `frontend/src/lib/platform/persistence-adapter.ts`
  - Replace readiness-only production behavior with adapter selection status.
  - Report supported managed provider configuration and fail closed for unknown or missing providers.

- Modify: `frontend/src/lib/platform/readiness.ts`
  - Include production auth, managed persistence, audit observability, and evidence retention readiness in production blockers.
  - Stop reporting `storeMode: "filesystem"` when production managed persistence is selected.

- Modify: `frontend/src/lib/platform/production-auth.ts`
  - Harden trusted-header auth configuration parsing.
  - Add explicit provider/mode readiness helpers that distinguish configured provider from enforced auth.

- Modify: `frontend/src/lib/platform/auth.ts`
  - Append audit events for production mutation authorization successes and failures.
  - Preserve demo-private behavior outside production.

- Create: `frontend/src/lib/platform/observability.ts`
  - Provide structured audit/observability event builders.
  - Provide a redacted status snapshot for production operations.

- Modify: `frontend/src/lib/platform/evidence-policy.ts`
  - Add retention policy parsing.
  - Return evidence retention decisions alongside URL allow/reject results.

- Modify: `frontend/src/app/api/platform/status/route.ts` if present, otherwise create it.
  - Return redacted readiness/observability status for operators.
  - Never expose secrets, raw evidence URLs, audit payloads, memberships, or unpublished passport data.

- Modify: mutation routes that already call `authorizePlatformMutation`:
  - `frontend/src/app/api/cases/route.ts`
  - `frontend/src/app/api/evidence/route.ts`
  - `frontend/src/app/api/verifications/route.ts`
  - `frontend/src/app/api/passports/route.ts`
  - `frontend/src/app/api/genlayer/verify-case/route.ts`
  - Ensure each route uses the repository/authorization path and emits production audit events through shared helpers.

- Modify: `frontend/tests/platform.test.ts`
  - Add all regression and production foundation tests before production code changes.
  - Keep existing platform tests passing.

- Modify: `docs/CURRENT_MAP.md`
  - Document the production foundation environment variables and constraints after implementation.

---

### Task 1: Production auth readiness hardening

**Files:**
- Modify: `frontend/tests/platform.test.ts`
- Modify: `frontend/src/lib/platform/production-auth.ts`
- Modify: `frontend/src/lib/platform/readiness.ts`
- Modify: `docs/CURRENT_MAP.md`

- [ ] **Step 1: Write failing tests for production auth provider enforcement**

Add these tests near the existing production auth and platform readiness tests in `frontend/tests/platform.test.ts`:

```ts
test("production readiness requires trusted-header provider and secret", () => {
  const status = buildPlatformReadinessStatus({
    LEXNET_RUNTIME_MODE: "production",
    LEXNET_PRODUCTION_AUTH_PROVIDER: "trusted-header",
    LEXNET_PRODUCTION_AUTH_MODE: "trusted-header",
    LEXNET_PRODUCTION_AUTH_SECRET: "super-secret",
    LEXNET_MANAGED_PERSISTENCE_PROVIDER: "postgres",
    LEXNET_MANAGED_DATABASE_URL: "postgres://lexnet.example/db",
    LEXNET_EVIDENCE_RETENTION_POLICY: "metadata-365d",
    NEXT_PUBLIC_GENLAYER_RPC_URL: "https://studio.genlayer.com/api",
    NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS: "0xabc",
  });

  assert.equal(status.auth.productionAuthConfigured, true);
  assert.equal(status.auth.productionAuthEnforced, true);
  assert.equal(status.auth.productionAuthMode, "trusted-header");
  assert.equal(
    status.auth.blockingReasons.includes("Production authentication provider must be trusted-header."),
    false,
  );
});

test("production readiness blocks unsupported production auth provider", () => {
  const status = buildPlatformReadinessStatus({
    LEXNET_RUNTIME_MODE: "production",
    LEXNET_PRODUCTION_AUTH_PROVIDER: "oauth",
    LEXNET_PRODUCTION_AUTH_MODE: "trusted-header",
    LEXNET_PRODUCTION_AUTH_SECRET: "super-secret",
  });

  assert.equal(status.auth.productionAuthConfigured, true);
  assert.equal(status.auth.productionAuthEnforced, false);
  assert.ok(status.auth.blockingReasons.includes("Production authentication provider must be trusted-header."));
});
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run:

```bash
npm --prefix frontend run test:platform
```

Expected: FAIL because unsupported provider handling does not exist yet, and the second test reports `productionAuthEnforced` as true or lacks the provider blocking reason.

- [ ] **Step 3: Add production auth configuration helper**

In `frontend/src/lib/platform/production-auth.ts`, add a provider field and helper:

```ts
export type ProductionAuthProvider = "trusted-header";

export interface ProductionAuthConfigurationStatus {
  providerConfigured: boolean;
  providerSupported: boolean;
  secretConfigured: boolean;
  modeConfigured: boolean;
  enforced: boolean;
  blockingReasons: string[];
}

export function getProductionAuthConfigurationStatus(env: ProductionAuthEnv): ProductionAuthConfigurationStatus {
  const providerConfigured = Boolean(env.LEXNET_PRODUCTION_AUTH_PROVIDER);
  const providerSupported = env.LEXNET_PRODUCTION_AUTH_PROVIDER === "trusted-header";
  const modeConfigured = env.LEXNET_PRODUCTION_AUTH_MODE === "trusted-header";
  const secretConfigured = Boolean(env.LEXNET_PRODUCTION_AUTH_SECRET);
  const blockingReasons: string[] = [];

  if (!providerConfigured) {
    blockingReasons.push("Production authentication provider is not configured.");
  } else if (!providerSupported) {
    blockingReasons.push("Production authentication provider must be trusted-header.");
  }

  if (!modeConfigured) {
    blockingReasons.push("Production authentication mode is not configured.");
  }

  if (!secretConfigured) {
    blockingReasons.push("Production authentication secret is not configured.");
  }

  return {
    providerConfigured,
    providerSupported,
    secretConfigured,
    modeConfigured,
    enforced: providerSupported && modeConfigured && secretConfigured,
    blockingReasons,
  };
}
```

Also extend `ProductionAuthEnv`:

```ts
LEXNET_PRODUCTION_AUTH_PROVIDER?: string;
```

Update `isProductionAuthConfigured()` to use the helper:

```ts
export function isProductionAuthConfigured(env: ProductionAuthEnv): boolean {
  return getProductionAuthConfigurationStatus(env).enforced;
}
```

- [ ] **Step 4: Wire auth readiness to the helper**

In `frontend/src/lib/platform/readiness.ts`, change the production-auth import:

```ts
import {
  getProductionAuthConfigurationStatus,
  type ProductionAuthMode,
} from "./production-auth";
```

Replace the configuration logic in `buildAuthReadiness()` with:

```ts
const authStatus = getProductionAuthConfigurationStatus(env);
const productionAuthConfigured = authStatus.providerConfigured || authStatus.modeConfigured || authStatus.secretConfigured;
const productionAuthEnforced = authStatus.enforced;
const blockingReasons = [...authStatus.blockingReasons];
```

Keep the demo-private token check before returning:

```ts
if (demoPrivateApiEnabled && !demoPrivateApiTokenConfigured) {
  blockingReasons.unshift("Demo-private API token is not configured.");
}
```

Return the production mode only when enforced:

```ts
productionAuthMode: productionAuthEnforced ? "trusted-header" : undefined,
```

- [ ] **Step 5: Run focused tests and verify they pass**

Run:

```bash
npm --prefix frontend run test:platform
```

Expected: PASS for the new auth readiness tests and no regression in existing production-auth HMAC tests.

- [ ] **Step 6: Update project map auth environment notes**

In `docs/CURRENT_MAP.md`, update the production environment section so these lines are present:

```bash
LEXNET_PRODUCTION_AUTH_PROVIDER=trusted-header
LEXNET_PRODUCTION_AUTH_MODE=trusted-header
LEXNET_PRODUCTION_AUTH_SECRET=
LEXNET_PRODUCTION_AUTH_CLOCK_SKEW_SECONDS=60
```

Add one sentence near the auth notes:

```markdown
Production mutation routes fail closed unless `LEXNET_PRODUCTION_AUTH_PROVIDER=trusted-header`, `LEXNET_PRODUCTION_AUTH_MODE=trusted-header`, and `LEXNET_PRODUCTION_AUTH_SECRET` are configured together.
```

- [ ] **Step 7: Commit**

Run:

```bash
git add frontend/tests/platform.test.ts frontend/src/lib/platform/production-auth.ts frontend/src/lib/platform/readiness.ts docs/CURRENT_MAP.md
git commit -m "$(cat <<'EOF'
fix: harden production auth readiness

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Managed persistence adapter boundary

**Files:**
- Modify: `frontend/tests/platform.test.ts`
- Modify: `frontend/src/lib/platform/persistence-adapter.ts`
- Modify: `frontend/src/lib/platform/store.ts`
- Modify: `frontend/src/lib/platform/readiness.ts`
- Modify: `docs/CURRENT_MAP.md`

- [ ] **Step 1: Write failing tests for managed persistence selection**

Add these tests near the existing persistence adapter tests in `frontend/tests/platform.test.ts`:

```ts
test("platform store adapter selects managed postgres in production", () => {
  const status = getPlatformStoreAdapterStatus({
    LEXNET_RUNTIME_MODE: "production",
    LEXNET_MANAGED_PERSISTENCE_PROVIDER: "postgres",
    LEXNET_MANAGED_DATABASE_URL: "postgres://lexnet.example/db",
  });

  assert.equal(status.mode, "managed-configured");
  assert.equal(status.canRead, true);
  assert.equal(status.canMutate, true);
  assert.equal(status.managedPersistenceConfigured, true);
  assert.equal(status.managedPersistenceEnforced, true);
  assert.deepEqual(status.blockingReasons, []);
});

test("platform store adapter blocks unsupported managed provider", () => {
  const status = getPlatformStoreAdapterStatus({
    LEXNET_RUNTIME_MODE: "production",
    LEXNET_MANAGED_PERSISTENCE_PROVIDER: "sqlite",
    LEXNET_MANAGED_DATABASE_URL: "file:lexnet.db",
  });

  assert.equal(status.mode, "managed-missing");
  assert.equal(status.canRead, false);
  assert.equal(status.canMutate, false);
  assert.equal(status.managedPersistenceConfigured, true);
  assert.equal(status.managedPersistenceEnforced, false);
  assert.ok(status.blockingReasons.includes("Managed persistence provider must be postgres."));
});

test("platform readiness reports managed persistence mode in production", () => {
  const status = buildPlatformReadinessStatus({
    LEXNET_RUNTIME_MODE: "production",
    LEXNET_PRODUCTION_AUTH_PROVIDER: "trusted-header",
    LEXNET_PRODUCTION_AUTH_MODE: "trusted-header",
    LEXNET_PRODUCTION_AUTH_SECRET: "super-secret",
    LEXNET_MANAGED_PERSISTENCE_PROVIDER: "postgres",
    LEXNET_MANAGED_DATABASE_URL: "postgres://lexnet.example/db",
    LEXNET_EVIDENCE_RETENTION_POLICY: "metadata-365d",
    NEXT_PUBLIC_GENLAYER_RPC_URL: "https://studio.genlayer.com/api",
    NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS: "0xabc",
  });

  assert.equal(status.storeMode, "managed");
  assert.equal(status.persistenceMode, "managed-configured");
  assert.equal(status.persistence.managedPersistenceEnforced, true);
});
```

- [ ] **Step 2: Run focused tests and verify they fail**

Run:

```bash
npm --prefix frontend run test:platform
```

Expected: FAIL because production still reports `managed-required`, `canRead: false`, `canMutate: false`, `managedPersistenceEnforced: false`, and `storeMode: "filesystem"`.

- [ ] **Step 3: Update persistence adapter modes**

In `frontend/src/lib/platform/persistence-adapter.ts`, change the mode type:

```ts
export type PlatformStoreAdapterMode = "filesystem-local" | "managed-configured" | "managed-missing";
```

Replace the production branch in `getPlatformStoreAdapterStatus()` with:

```ts
const managedProvider = env.LEXNET_MANAGED_PERSISTENCE_PROVIDER;
const managedDatabaseUrlConfigured = Boolean(env.LEXNET_MANAGED_DATABASE_URL);
const managedPersistenceConfigured = Boolean(managedProvider || env.LEXNET_MANAGED_DATABASE_URL);
const managedProviderSupported = managedProvider === "postgres";

if (runtimeMode !== "production") {
  return {
    mode: "filesystem-local",
    runtimeMode,
    canRead: true,
    canMutate: true,
    managedPersistenceConfigured,
    managedPersistenceEnforced: false,
    blockingReasons: runtimeMode === "pilot"
      ? ["Local filesystem persistence is pilot infrastructure, not production infrastructure."]
      : [],
  };
}

const blockingReasons: string[] = [];
if (!managedProvider) {
  blockingReasons.push("Managed persistence provider is not configured.");
} else if (!managedProviderSupported) {
  blockingReasons.push("Managed persistence provider must be postgres.");
}

if (!managedDatabaseUrlConfigured) {
  blockingReasons.push("Managed database URL is not configured.");
}

const managedPersistenceEnforced = managedProviderSupported && managedDatabaseUrlConfigured;

return {
  mode: managedPersistenceEnforced ? "managed-configured" : "managed-missing",
  runtimeMode,
  canRead: managedPersistenceEnforced,
  canMutate: managedPersistenceEnforced,
  managedPersistenceConfigured,
  managedPersistenceEnforced,
  blockingReasons,
};
```

- [ ] **Step 4: Add repository interface and filesystem wrapper**

In `frontend/src/lib/platform/store.ts`, add this interface near the constants:

```ts
export interface PlatformStoreRepository {
  read(): Promise<PlatformStore>;
  write(store: PlatformStore): Promise<void>;
  mutate(mutate: (store: PlatformStore) => void | Promise<void>): Promise<PlatformStore>;
}
```

Add this factory after `mutatePlatformStore()`:

```ts
export function createFilesystemPlatformStoreRepository(
  storePath = DEFAULT_PLATFORM_STORE_PATH,
): PlatformStoreRepository {
  return {
    read: () => readPlatformStore(storePath),
    write: (store) => writePlatformStore(store, storePath),
    mutate: (mutate) => mutatePlatformStore(mutate, storePath),
  };
}
```

Add a production-safe selector:

```ts
export function createPlatformStoreRepository(
  env: Record<string, string | undefined> = process.env,
  storePath = DEFAULT_PLATFORM_STORE_PATH,
): PlatformStoreRepository {
  if (env.LEXNET_RUNTIME_MODE !== "production") {
    return createFilesystemPlatformStoreRepository(storePath);
  }

  if (env.LEXNET_MANAGED_PERSISTENCE_PROVIDER === "postgres" && env.LEXNET_MANAGED_DATABASE_URL) {
    return createFilesystemPlatformStoreRepository(storePath);
  }

  throw new Error("Managed persistence is required in production.");
}
```

This sprint only creates the adapter boundary. The `postgres` provider is configuration-enforced and still delegates to the current repository implementation until a database client is introduced in a later sprint.

- [ ] **Step 5: Update readiness store mode**

In `frontend/src/lib/platform/readiness.ts`, change `PlatformReadinessStatus.storeMode` from:

```ts
storeMode: "filesystem";
```

to:

```ts
storeMode: "filesystem" | "managed";
```

Change the return value in `buildPlatformReadinessStatus()`:

```ts
storeMode: persistence.managedPersistenceEnforced ? "managed" : "filesystem",
```

Ensure `buildPersistenceReadiness()` maps from adapter status:

```ts
mode: adapterStatus.mode === "managed-configured"
  ? "managed-configured"
  : mode === "production"
    ? "managed-missing"
    : "filesystem-local",
managedPersistenceEnforced: adapterStatus.managedPersistenceEnforced,
blockingReasons: adapterStatus.blockingReasons,
```

- [ ] **Step 6: Run focused tests and verify they pass**

Run:

```bash
npm --prefix frontend run test:platform
```

Expected: PASS for managed persistence adapter tests and no regression in store read/write/mutate tests.

- [ ] **Step 7: Update project map persistence notes**

In `docs/CURRENT_MAP.md`, add or update production persistence environment lines:

```bash
LEXNET_MANAGED_PERSISTENCE_PROVIDER=postgres
LEXNET_MANAGED_DATABASE_URL=
```

Add this note near platform storage:

```markdown
Production mode fails closed unless managed persistence is configured with provider `postgres` and a managed database URL. The current sprint introduces the adapter boundary and readiness enforcement; the filesystem pilot store remains the local-demo/pilot implementation.
```

- [ ] **Step 8: Commit**

Run:

```bash
git add frontend/tests/platform.test.ts frontend/src/lib/platform/persistence-adapter.ts frontend/src/lib/platform/store.ts frontend/src/lib/platform/readiness.ts docs/CURRENT_MAP.md
git commit -m "$(cat <<'EOF'
feat: add managed persistence boundary

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Audit and observability foundation

**Files:**
- Modify: `frontend/tests/platform.test.ts`
- Modify: `frontend/src/lib/platform/types.ts`
- Create: `frontend/src/lib/platform/observability.ts`
- Modify: `frontend/src/lib/platform/auth.ts`
- Create or modify: `frontend/src/app/api/platform/status/route.ts`
- Modify: `docs/CURRENT_MAP.md`

- [ ] **Step 1: Write failing tests for observability events and redacted status**

Add these tests to `frontend/tests/platform.test.ts`:

```ts
test("buildPlatformObservabilityStatus redacts production-sensitive data", () => {
  const store = createDefaultPlatformStore();
  store.auditEvents.push({
    id: "audit-1",
    type: "production.auth.accepted",
    entityType: "workspace",
    entityId: "workspace-demo",
    actorId: "operator-demo",
    createdAt: "2026-05-14T00:00:00.000Z",
    summary: "Production mutation authorized.",
  });

  const status = buildPlatformObservabilityStatus(store, {
    LEXNET_RUNTIME_MODE: "production",
    LEXNET_PRODUCTION_AUTH_PROVIDER: "trusted-header",
    LEXNET_PRODUCTION_AUTH_MODE: "trusted-header",
    LEXNET_PRODUCTION_AUTH_SECRET: "super-secret",
    LEXNET_MANAGED_PERSISTENCE_PROVIDER: "postgres",
    LEXNET_MANAGED_DATABASE_URL: "postgres://lexnet.example/db",
    LEXNET_EVIDENCE_RETENTION_POLICY: "metadata-365d",
  });

  assert.equal(status.runtimeMode, "production");
  assert.equal(status.auditEventCount, 1);
  assert.equal(status.latestAuditEventType, "production.auth.accepted");
  assert.equal("auditEvents" in status, false);
  assert.equal("operators" in status, false);
  assert.equal("memberships" in status, false);
  assert.equal(JSON.stringify(status).includes("super-secret"), false);
  assert.equal(JSON.stringify(status).includes("postgres://lexnet.example/db"), false);
});

test("buildProductionAuthAuditEvent records accepted production auth", () => {
  const event = buildProductionAuthAuditEvent({
    accepted: true,
    operatorId: "operator-demo",
    pathname: "/api/cases",
    method: "POST",
    createdAt: "2026-05-14T00:00:00.000Z",
  });

  assert.equal(event.type, "production.auth.accepted");
  assert.equal(event.entityType, "workspace");
  assert.equal(event.actorId, "operator-demo");
  assert.equal(event.summary, "Production mutation authorized for POST /api/cases.");
});
```

Add imports at the top of `frontend/tests/platform.test.ts`:

```ts
import {
  buildPlatformObservabilityStatus,
  buildProductionAuthAuditEvent,
} from "../src/lib/platform/observability";
```

- [ ] **Step 2: Run focused tests and verify they fail**

Run:

```bash
npm --prefix frontend run test:platform
```

Expected: FAIL because `platform/observability.ts` and the new audit event type do not exist yet.

- [ ] **Step 3: Add audit event types**

In `frontend/src/lib/platform/types.ts`, extend `PlatformAuditType`:

```ts
| "production.auth.accepted"
| "production.auth.rejected"
| "production.persistence.selected"
| "evidence.retention.applied"
```

No public passport type should be changed.

- [ ] **Step 4: Create observability helper**

Create `frontend/src/lib/platform/observability.ts`:

```ts
import { randomUUID } from "node:crypto";
import { buildPlatformReadinessStatus, getLexNetRuntimeMode, type PlatformReadinessEnv } from "./readiness";
import type { PlatformAuditEvent, PlatformStore } from "./types";

export interface ProductionAuthAuditEventInput {
  accepted: boolean;
  operatorId?: string;
  pathname: string;
  method: string;
  reason?: string;
  createdAt?: string;
}

export interface PlatformObservabilityStatus {
  runtimeMode: ReturnType<typeof getLexNetRuntimeMode>;
  readinessBlockingReasonCount: number;
  productionBlockerCount: number;
  auditEventCount: number;
  latestAuditEventType: PlatformAuditEvent["type"] | null;
  latestAuditEventAt: string | null;
  managedPersistenceEnforced: boolean;
  productionAuthEnforced: boolean;
  evidenceRetentionPolicyConfigured: boolean;
}

export function buildProductionAuthAuditEvent(input: ProductionAuthAuditEventInput): PlatformAuditEvent {
  const eventType = input.accepted ? "production.auth.accepted" : "production.auth.rejected";
  const summary = input.accepted
    ? `Production mutation authorized for ${input.method.toUpperCase()} ${input.pathname}.`
    : `Production mutation rejected for ${input.method.toUpperCase()} ${input.pathname}.`;

  return {
    id: randomUUID(),
    type: eventType,
    entityType: "workspace",
    entityId: "platform",
    actorId: input.operatorId ?? "production-auth",
    createdAt: input.createdAt ?? new Date().toISOString(),
    summary: input.reason ? `${summary} ${input.reason}` : summary,
  };
}

export function buildPlatformObservabilityStatus(
  store: PlatformStore,
  env: PlatformReadinessEnv,
): PlatformObservabilityStatus {
  const readiness = buildPlatformReadinessStatus(env);
  const latestAuditEvent = store.auditEvents.at(-1) ?? null;

  return {
    runtimeMode: getLexNetRuntimeMode(env),
    readinessBlockingReasonCount: readiness.blockingReasons.length,
    productionBlockerCount: readiness.productionBlockers.length,
    auditEventCount: store.auditEvents.length,
    latestAuditEventType: latestAuditEvent?.type ?? null,
    latestAuditEventAt: latestAuditEvent?.createdAt ?? null,
    managedPersistenceEnforced: readiness.persistence.managedPersistenceEnforced,
    productionAuthEnforced: readiness.auth.productionAuthEnforced,
    evidenceRetentionPolicyConfigured: readiness.evidencePolicy.retentionPolicyConfigured,
  };
}
```

- [ ] **Step 5: Wire production auth audit events**

In `frontend/src/lib/platform/auth.ts`, import the helper:

```ts
import { buildProductionAuthAuditEvent } from "./observability";
import { appendAuditEvent } from "./store";
```

Inside the production branch of `authorizePlatformMutation()`, after resolving `context` and before returning failures, add rejected event append for production auth failures:

```ts
const { pathname } = new URL(request.url);
if (!context.authorized) {
  await appendAuditEvent(buildProductionAuthAuditEvent({
    accepted: false,
    pathname,
    method: request.method,
    reason: context.code,
  }));
  return { authorized: false, response: jsonError(context.reason, context.status) };
}
```

After the operator lookup succeeds, append accepted event:

```ts
await appendAuditEvent(buildProductionAuthAuditEvent({
  accepted: true,
  operatorId: operator.id,
  pathname,
  method: request.method,
}));
```

If `appendAuditEvent` already uses the default store path, keep it there for this sprint. Do not expose audit events through public routes.

- [ ] **Step 6: Add redacted platform status route**

If `frontend/src/app/api/platform/status/route.ts` does not exist, create it:

```ts
import { NextResponse } from "next/server";
import { buildPlatformObservabilityStatus } from "@/lib/platform/observability";
import { buildPlatformReadinessStatus } from "@/lib/platform/readiness";
import { readPlatformStore } from "@/lib/platform/store";

export async function GET() {
  const store = await readPlatformStore();
  return NextResponse.json({
    readiness: buildPlatformReadinessStatus(process.env),
    observability: buildPlatformObservabilityStatus(store, process.env),
  });
}
```

If the file already exists, replace its response shape with the same redacted fields. Do not include `store`, `auditEvents`, `operators`, `memberships`, raw cases, raw evidence URLs, unpublished passport records, secrets, or database URLs.

- [ ] **Step 7: Run focused tests and verify they pass**

Run:

```bash
npm --prefix frontend run test:platform
```

Expected: PASS for observability helper tests and no regression in auth mutation tests.

- [ ] **Step 8: Update project map observability notes**

In `docs/CURRENT_MAP.md`, add:

```markdown
`/api/platform/status` returns redacted readiness and observability counters only. It must not return raw audit event payloads, operators, memberships, evidence URLs, unpublished passport records, secrets, database URLs, payout status, or settlement finality claims.
```

- [ ] **Step 9: Commit**

Run:

```bash
git add frontend/tests/platform.test.ts frontend/src/lib/platform/types.ts frontend/src/lib/platform/observability.ts frontend/src/lib/platform/auth.ts frontend/src/app/api/platform/status/route.ts docs/CURRENT_MAP.md
git commit -m "$(cat <<'EOF'
feat: add production observability foundation

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Evidence retention policy enforcement

**Files:**
- Modify: `frontend/tests/platform.test.ts`
- Modify: `frontend/src/lib/platform/evidence-policy.ts`
- Modify: `frontend/src/lib/platform/readiness.ts`
- Modify: `frontend/src/lib/platform/types.ts`
- Modify: evidence submission route that calls `evaluateEvidenceUrlPolicy`, usually `frontend/src/app/api/evidence/route.ts`
- Modify: `docs/CURRENT_MAP.md`

- [ ] **Step 1: Write failing tests for retention policy parsing and decisions**

Add these tests near the existing evidence URL policy tests in `frontend/tests/platform.test.ts`:

```ts
test("parseEvidenceRetentionPolicy accepts metadata day policies", () => {
  const policy = parseEvidenceRetentionPolicy("metadata-365d");

  assert.deepEqual(policy, {
    configured: true,
    mode: "metadata-only",
    retentionDays: 365,
    blockingReasons: [],
  });
});

test("parseEvidenceRetentionPolicy rejects unsupported policies", () => {
  const policy = parseEvidenceRetentionPolicy("raw-forever");

  assert.equal(policy.configured, true);
  assert.equal(policy.mode, "invalid");
  assert.ok(policy.blockingReasons.includes("Evidence retention policy must use metadata-{days}d."));
});

test("evaluateEvidenceUrlPolicy includes production retention decision", () => {
  const result = evaluateEvidenceUrlPolicy(["https://merchant.example/evidence.pdf"], {
    LEXNET_RUNTIME_MODE: "production",
    LEXNET_EVIDENCE_RETENTION_POLICY: "metadata-365d",
  });

  assert.deepEqual(result.acceptedUrls, ["https://merchant.example/evidence.pdf"]);
  assert.equal(result.retention.configured, true);
  assert.equal(result.retention.mode, "metadata-only");
  assert.equal(result.retention.retentionDays, 365);
  assert.deepEqual(result.retention.blockingReasons, []);
});

test("evaluateEvidenceUrlPolicy blocks production evidence without retention policy", () => {
  const result = evaluateEvidenceUrlPolicy(["https://merchant.example/evidence.pdf"], {
    LEXNET_RUNTIME_MODE: "production",
  });

  assert.deepEqual(result.acceptedUrls, []);
  assert.ok(result.blockingReasons.includes("Evidence retention policy is not configured."));
});
```

Add import if needed:

```ts
import { parseEvidenceRetentionPolicy } from "../src/lib/platform/evidence-policy";
```

- [ ] **Step 2: Run focused tests and verify they fail**

Run:

```bash
npm --prefix frontend run test:platform
```

Expected: FAIL because retention parser and `retention` result do not exist yet, and production without policy still accepts HTTPS evidence URLs.

- [ ] **Step 3: Add retention policy types and parser**

In `frontend/src/lib/platform/evidence-policy.ts`, add:

```ts
export type EvidenceRetentionMode = "metadata-only" | "invalid";

export interface EvidenceRetentionPolicyStatus {
  configured: boolean;
  mode: EvidenceRetentionMode;
  retentionDays: number | null;
  blockingReasons: string[];
}

export function parseEvidenceRetentionPolicy(policy: string | undefined): EvidenceRetentionPolicyStatus {
  if (!policy) {
    return {
      configured: false,
      mode: "invalid",
      retentionDays: null,
      blockingReasons: ["Evidence retention policy is not configured."],
    };
  }

  const match = /^metadata-(\d+)d$/.exec(policy);
  if (!match) {
    return {
      configured: true,
      mode: "invalid",
      retentionDays: null,
      blockingReasons: ["Evidence retention policy must use metadata-{days}d."],
    };
  }

  const retentionDays = Number(match[1]);
  if (!Number.isSafeInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) {
    return {
      configured: true,
      mode: "invalid",
      retentionDays: null,
      blockingReasons: ["Evidence retention policy must retain metadata for 1 to 3650 days."],
    };
  }

  return {
    configured: true,
    mode: "metadata-only",
    retentionDays,
    blockingReasons: [],
  };
}
```

Update `EvidenceUrlPolicyResult`:

```ts
retention: EvidenceRetentionPolicyStatus;
```

- [ ] **Step 4: Enforce retention decisions in URL policy**

In `evaluateEvidenceUrlPolicy()`, add:

```ts
const retention = parseEvidenceRetentionPolicy(env.LEXNET_EVIDENCE_RETENTION_POLICY);
const retentionBlockingReasons = mode === "production" ? retention.blockingReasons : [];
```

Before returning, if production retention is invalid, clear accepted URLs:

```ts
const productionAcceptedUrls = mode === "production" && retentionBlockingReasons.length > 0 ? [] : acceptedUrls;
```

Return:

```ts
return {
  acceptedUrls: productionAcceptedUrls,
  rejectedUrls,
  retention,
  blockingReasons: [
    ...rejectedUrls.map(({ url, reason }) => `${url}: ${reason}`),
    ...retentionBlockingReasons,
  ],
};
```

- [ ] **Step 5: Wire readiness evidence policy to parser**

In `frontend/src/lib/platform/readiness.ts`, import:

```ts
import { parseEvidenceRetentionPolicy } from "./evidence-policy";
```

Replace `buildEvidencePolicyStatus()` retention logic with:

```ts
const retention = parseEvidenceRetentionPolicy(env.LEXNET_EVIDENCE_RETENTION_POLICY);
const blockingReasons = mode === "production" ? retention.blockingReasons : [];
```

Return:

```ts
retentionPolicyConfigured: retention.configured && retention.mode === "metadata-only",
blockingReasons,
```

- [ ] **Step 6: Add retention audit event type usage to evidence route**

In the evidence submission route that calls `evaluateEvidenceUrlPolicy`, after accepting a production evidence submission, append an audit event:

```ts
await appendAuditEvent({
  id: randomUUID(),
  type: "evidence.retention.applied",
  entityType: "evidence",
  entityId: evidenceRecord.id,
  actorId: authorization.operator.id,
  createdAt: new Date().toISOString(),
  summary: `Evidence metadata retention policy ${policy.retention.retentionDays} days applied.`,
});
```

Use existing route variable names for `evidenceRecord`, `authorization`, and `policy`. If the route already imports `randomUUID` or `appendAuditEvent`, reuse those imports. Do not store raw evidence bodies; keep raw evidence storage disabled.

- [ ] **Step 7: Run focused tests and verify they pass**

Run:

```bash
npm --prefix frontend run test:platform
```

Expected: PASS for retention parser tests and existing evidence URL policy tests.

- [ ] **Step 8: Update project map evidence notes**

In `docs/CURRENT_MAP.md`, add:

```markdown
Production evidence requires HTTPS public URLs plus `LEXNET_EVIDENCE_RETENTION_POLICY=metadata-{days}d`. Raw evidence storage remains disabled; LexNet stores metadata and trust signals only.
```

- [ ] **Step 9: Commit**

Run:

```bash
git add frontend/tests/platform.test.ts frontend/src/lib/platform/evidence-policy.ts frontend/src/lib/platform/readiness.ts frontend/src/lib/platform/types.ts frontend/src/app/api/evidence/route.ts docs/CURRENT_MAP.md
git commit -m "$(cat <<'EOF'
feat: enforce evidence retention policy

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Route integration and production foundation verification

**Files:**
- Modify: `frontend/tests/platform.test.ts`
- Modify: production mutation routes using platform auth and store helpers
- Modify: `frontend/src/lib/platform/store.ts`
- Modify: `frontend/src/lib/platform/readiness.ts`
- Modify: `docs/CURRENT_MAP.md`

- [ ] **Step 1: Write failing integration tests for production-ready blockers**

Add this test near the platform readiness tests in `frontend/tests/platform.test.ts`:

```ts
test("production readiness has no production blockers when foundation is configured", () => {
  const status = buildPlatformReadinessStatus({
    LEXNET_RUNTIME_MODE: "production",
    LEXNET_PRODUCTION_AUTH_PROVIDER: "trusted-header",
    LEXNET_PRODUCTION_AUTH_MODE: "trusted-header",
    LEXNET_PRODUCTION_AUTH_SECRET: "super-secret",
    LEXNET_MANAGED_PERSISTENCE_PROVIDER: "postgres",
    LEXNET_MANAGED_DATABASE_URL: "postgres://lexnet.example/db",
    LEXNET_EVIDENCE_RETENTION_POLICY: "metadata-365d",
    NEXT_PUBLIC_GENLAYER_RPC_URL: "https://studio.genlayer.com/api",
    NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS: "0xabc",
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: "walletconnect-project",
  });

  assert.deepEqual(status.productionBlockers, []);
  assert.equal(status.auth.mutatingRoutesAllowed, true);
  assert.equal(status.persistence.managedPersistenceEnforced, true);
  assert.equal(status.evidencePolicy.retentionPolicyConfigured, true);
  assert.equal(status.storeMode, "managed");
});
```

- [ ] **Step 2: Run focused tests and verify they fail if any subsystem is not wired**

Run:

```bash
npm --prefix frontend run test:platform
```

Expected: FAIL if any earlier task did not wire readiness fully. If earlier tasks were completed exactly, this test may already pass; in that case, keep it as integration coverage and proceed.

- [ ] **Step 3: Replace direct default store usage in mutation routes where necessary**

For each mutation route listed in the file structure, ensure the route uses existing store helpers consistently and does not bypass `authorizePlatformMutation()`. The pattern should be:

```ts
const store = await readPlatformStore();
const authorization = await authorizePlatformMutation(request, process.env, store);
if (!authorization.authorized) {
  return authorization.response;
}
```

Then mutate through the existing `mutatePlatformStore()` path or the new repository boundary:

```ts
const repository = createPlatformStoreRepository(process.env);
const nextStore = await repository.mutate((draft) => {
  // existing mutation body remains here
});
```

Do not add mutation routes that move money, settle disputes, custody funds, or mark payouts complete.

- [ ] **Step 4: Ensure public passport route remains privacy-safe**

In any public passport route/component touched by this sprint, verify the response still uses `PublicPassportView` or the existing public selector. The response must not include:

```ts
store.auditEvents
store.operators
store.memberships
caseRecord.evidenceUrls
caseRecord.privateCaseId
unpublished passport records
workspace raw data
payout status
settlement finality claims
```

No code should be added for these fields.

- [ ] **Step 5: Run full verification**

Run:

```bash
npm --prefix frontend run test:domain
npm --prefix frontend run test:platform
npm --prefix frontend exec tsc -- -p frontend/tsconfig.json --noEmit
npm --prefix frontend run build
```

Expected:

```text
npm --prefix frontend run test:domain exits 0 with all domain tests passing.
npm --prefix frontend run test:platform exits 0 with all platform tests passing.
npm --prefix frontend exec tsc -- -p frontend/tsconfig.json --noEmit exits 0 with no TypeScript errors.
npm --prefix frontend run build exits 0 and completes the production Next.js build.
```

- [ ] **Step 6: Run production readiness smoke check**

Run:

```bash
$env:LEXNET_RUNTIME_MODE = "production"; $env:LEXNET_PRODUCTION_AUTH_PROVIDER = "trusted-header"; $env:LEXNET_PRODUCTION_AUTH_MODE = "trusted-header"; $env:LEXNET_PRODUCTION_AUTH_SECRET = "super-secret"; $env:LEXNET_MANAGED_PERSISTENCE_PROVIDER = "postgres"; $env:LEXNET_MANAGED_DATABASE_URL = "postgres://lexnet.example/db"; $env:LEXNET_EVIDENCE_RETENTION_POLICY = "metadata-365d"; $env:NEXT_PUBLIC_GENLAYER_RPC_URL = "https://studio.genlayer.com/api"; $env:NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS = "0xabc"; npm --prefix frontend run pilot:check
```

Expected: the readiness check reports production foundation auth, persistence, and evidence retention as configured. If `pilot:check` is intentionally pilot-only and fails due to production mode assumptions, record the exact output and verify `buildPlatformReadinessStatus()` through `test:platform` instead.

- [ ] **Step 7: Update project map production foundation status**

In `docs/CURRENT_MAP.md`, add a concise status line:

```markdown
Production Foundation Sprint status: trusted-header mutation auth, managed persistence readiness enforcement, redacted observability status, and metadata-only evidence retention are wired. This does not add custody, payouts, settlement finality, or real value movement.
```

- [ ] **Step 8: Commit**

Run:

```bash
git add frontend/tests/platform.test.ts frontend/src/lib/platform/store.ts frontend/src/lib/platform/readiness.ts frontend/src/app/api docs/CURRENT_MAP.md
git commit -m "$(cat <<'EOF'
feat: wire production foundation readiness

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Final Verification Checklist

Run after all tasks are complete:

```bash
git status --short
npm --prefix frontend run test:domain
npm --prefix frontend run test:platform
npm --prefix frontend exec tsc -- -p frontend/tsconfig.json --noEmit
npm --prefix frontend run build
```

Expected:

```text
git status --short shows only intentional tracked changes before the final commit, or clean after commits.
Domain tests exit 0.
Platform tests exit 0.
TypeScript exits 0.
Next.js production build exits 0.
```

Do not report the sprint complete unless the fresh verification output confirms these commands passed.

## Self-Review Notes

- Spec coverage: auth, managed persistence, audit/observability, and evidence retention each have a dedicated task plus final integration verification.
- Placeholder scan: no TBD/TODO/fill-in-later instructions remain; route steps name exact existing route patterns and required constraints.
- Type consistency: readiness, adapter, retention, observability, and audit type names are consistent across tasks.
- Scope guard: the plan explicitly avoids custody, payouts, escrow completion, fake settlement finality, and real value movement.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-14-production-foundation-sprint.md`. Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
