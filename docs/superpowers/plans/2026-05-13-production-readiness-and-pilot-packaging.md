# Production Readiness and Pilot Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add production readiness boundaries and pilot packaging scripts so LexNet can clearly distinguish local demo, pilot, and production blockers without choosing external vendors or storing secrets.

**Architecture:** Runtime/auth/persistence/evidence readiness lives in small pure helpers under `frontend/src/lib/platform/`, and `/api/security/status` composes those helpers into a public-safe status response. Pilot scripts reuse the same helpers and filesystem store utilities, while refusing production-mode preparation and scanning local store JSON for forbidden secret-like keys.

**Tech Stack:** Next.js App Router, TypeScript, Node `tsx`, Node test runner, local filesystem `.lexnet-data/store.json`, existing platform store/auth/readiness helpers.

---

## File Structure

- Create `frontend/src/lib/platform/readiness.ts` for runtime mode, auth readiness, persistence readiness, evidence policy status, GenLayer readiness summary, and public-safe security status composition.
- Create `frontend/src/lib/platform/pilot-summary.ts` for `PilotSummary` generation from the existing platform store and readiness helpers.
- Modify `frontend/src/lib/platform/api.ts` to re-export or delegate `buildSecurityStatus()` to the new readiness helper while preserving the existing import path used by tests and routes.
- Modify `frontend/src/lib/platform/auth.ts` so demo-private authorization can reject production-mode mutating requests when no production auth provider is configured.
- Modify mutating demo-private API routes that call `authorizeDemoPrivateApi()` only if the helper signature needs request mode enforcement; otherwise keep route code unchanged and centralize the gate in auth.
- Modify `frontend/src/app/api/security/status/route.ts` to return the expanded readiness object.
- Create `frontend/scripts/pilot-check.ts` for `npm run pilot:check`.
- Create `frontend/scripts/pilot-prepare.ts` for `npm run pilot:prepare`.
- Modify `frontend/package.json` to add `pilot:check` and `pilot:prepare` scripts.
- Create `docs/PILOT_RUNBOOK.md` with local setup, env checklist, workflows, readiness commands, known blockers, forbidden claims, and data boundaries.
- Modify `README.md`, `ARCHITECTURE.md`, and `docs/CURRENT_MAP.md` to mention pilot commands and production readiness boundaries.
- Modify `frontend/tests/platform.test.ts` to cover runtime mode, auth/persistence/evidence readiness, security status secrecy, pilot summary, pilot scripts, and forbidden secret scan behavior.

## Task 1: Runtime, Auth, Persistence, and Evidence Readiness Helpers

**Files:**
- Create: `frontend/src/lib/platform/readiness.ts`
- Modify: `frontend/src/lib/platform/api.ts`
- Test: `frontend/tests/platform.test.ts`

- [ ] **Step 1: Write failing readiness helper tests**

Add these imports near the top of `frontend/tests/platform.test.ts`:

```ts
import {
  buildAuthReadiness,
  buildEvidencePolicyStatus,
  buildPersistenceReadiness,
  buildPlatformReadinessStatus,
  getLexNetRuntimeMode,
  type PlatformReadinessEnv,
} from "../src/lib/platform/readiness";
```

Add these tests after the existing `createDefaultPlatformStore includes demo workspace, operator, queue, and audit arrays` test:

```ts
test("getLexNetRuntimeMode defaults to local demo", () => {
  assert.equal(getLexNetRuntimeMode({}), "local-demo");
  assert.equal(getLexNetRuntimeMode({ LEXNET_RUNTIME_MODE: "pilot" }), "pilot");
  assert.equal(getLexNetRuntimeMode({ LEXNET_RUNTIME_MODE: "production" }), "production");
  assert.equal(getLexNetRuntimeMode({ LEXNET_RUNTIME_MODE: "unexpected" }), "local-demo");
});

test("buildAuthReadiness blocks production mutating routes without provider", () => {
  const readiness = buildAuthReadiness({
    LEXNET_RUNTIME_MODE: "production",
    LEXNET_ENABLE_DEMO_PRIVATE_API: "true",
  });

  assert.equal(readiness.mode, "production");
  assert.equal(readiness.demoPrivateApiEnabled, true);
  assert.equal(readiness.productionAuthConfigured, false);
  assert.equal(readiness.mutatingRoutesAllowed, false);
  assert.match(readiness.blockingReasons.join("\n"), /Production authentication is not configured/);
});

test("buildAuthReadiness allows pilot demo-private mode but reports production auth blocker", () => {
  const readiness = buildAuthReadiness({
    LEXNET_RUNTIME_MODE: "pilot",
    LEXNET_ENABLE_DEMO_PRIVATE_API: "true",
  });

  assert.equal(readiness.mode, "pilot");
  assert.equal(readiness.mutatingRoutesAllowed, true);
  assert.match(readiness.blockingReasons.join("\n"), /Production authentication is not configured/);
});

test("buildPersistenceReadiness requires managed persistence in production", () => {
  const missing = buildPersistenceReadiness({ LEXNET_RUNTIME_MODE: "production" });
  assert.equal(missing.mode, "managed-missing");
  assert.equal(missing.managedPersistenceConfigured, false);
  assert.match(missing.blockingReasons.join("\n"), /Managed persistence is not configured/);

  const configured = buildPersistenceReadiness({
    LEXNET_RUNTIME_MODE: "production",
    LEXNET_MANAGED_PERSISTENCE_PROVIDER: "managed-db",
  });
  assert.equal(configured.mode, "managed-configured");
  assert.equal(configured.managedPersistenceConfigured, true);
  assert.deepEqual(configured.blockingReasons, []);
});

test("buildPersistenceReadiness allows pilot filesystem persistence with warning", () => {
  const readiness = buildPersistenceReadiness({ LEXNET_RUNTIME_MODE: "pilot" });

  assert.equal(readiness.mode, "filesystem-local");
  assert.equal(readiness.filesystemPersistenceAllowed, true);
  assert.match(readiness.blockingReasons.join("\n"), /Local filesystem persistence is pilot infrastructure/);
});

test("buildEvidencePolicyStatus requires retention policy in production", () => {
  const readiness = buildEvidencePolicyStatus({ LEXNET_RUNTIME_MODE: "production" });

  assert.equal(readiness.allowPublicHttpsOnly, true);
  assert.equal(readiness.rawEvidenceStorage, "disabled");
  assert.equal(readiness.blockedPrivateNetworkHosts, true);
  assert.equal(readiness.retentionPolicyConfigured, false);
  assert.match(readiness.blockingReasons.join("\n"), /Evidence retention policy is not configured/);
});

test("buildPlatformReadinessStatus omits raw secret values and connection strings", () => {
  const env: PlatformReadinessEnv = {
    LEXNET_RUNTIME_MODE: "production",
    LEXNET_ENABLE_DEMO_PRIVATE_API: "true",
    LEXNET_DEMO_PRIVATE_API_TOKEN: "secret-token-value",
    LEXNET_PRODUCTION_AUTH_PROVIDER: "oauth-provider",
    LEXNET_MANAGED_DATABASE_URL: "postgres://user:password@example.com/db",
    LEXNET_EVIDENCE_RETENTION_POLICY: "90-days",
    NEXT_PUBLIC_GENLAYER_RPC_URL: "https://studio.genlayer.com/api",
    NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS: "0x1111111111111111111111111111111111111111",
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: "walletconnect-secret",
  };

  const status = buildPlatformReadinessStatus(env);
  const serialized = JSON.stringify(status);

  assert.equal(status.runtimeMode, "production");
  assert.equal(status.auth.productionAuthProvider, "oauth-provider");
  assert.equal(status.persistence.managedPersistenceConfigured, true);
  assert.equal(serialized.includes("secret-token-value"), false);
  assert.equal(serialized.includes("password@example.com"), false);
  assert.equal(serialized.includes("walletconnect-secret"), false);
});
```

- [ ] **Step 2: Run readiness tests and verify they fail**

Run from `frontend`:

```bash
npm run test:platform
```

Expected: FAIL because `../src/lib/platform/readiness` does not exist.

- [ ] **Step 3: Create the readiness helper implementation**

Create `frontend/src/lib/platform/readiness.ts`:

```ts
import { getLexNetContractReadiness } from "../lexnet-contract";

export type LexNetRuntimeMode = "local-demo" | "pilot" | "production";

export interface PlatformReadinessEnv {
  [key: string]: string | undefined;
  LEXNET_RUNTIME_MODE?: string;
  LEXNET_ENABLE_DEMO_PRIVATE_API?: string;
  LEXNET_DEMO_PRIVATE_API_TOKEN?: string;
  LEXNET_PRODUCTION_AUTH_PROVIDER?: string;
  LEXNET_MANAGED_DATABASE_URL?: string;
  LEXNET_MANAGED_PERSISTENCE_PROVIDER?: string;
  LEXNET_EVIDENCE_RETENTION_POLICY?: string;
  NEXT_PUBLIC_GENLAYER_RPC_URL?: string;
  NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS?: string;
  NEXT_PUBLIC_GENLAYER_NETWORK_LABEL?: string;
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?: string;
}

export interface AuthReadiness {
  mode: LexNetRuntimeMode;
  demoPrivateApiEnabled: boolean;
  demoPrivateApiTokenConfigured: boolean;
  productionAuthProvider?: string;
  productionAuthConfigured: boolean;
  mutatingRoutesAllowed: boolean;
  blockingReasons: string[];
}

export type PlatformPersistenceMode =
  | "filesystem-local"
  | "managed-configured"
  | "managed-missing";

export interface PersistenceReadiness {
  mode: PlatformPersistenceMode;
  filesystemPersistenceAllowed: boolean;
  managedPersistenceConfigured: boolean;
  managedPersistenceProviderConfigured: boolean;
  managedDatabaseUrlConfigured: boolean;
  blockingReasons: string[];
}

export interface EvidencePolicyStatus {
  allowPublicHttpsOnly: boolean;
  rawEvidenceStorage: "disabled";
  retentionPolicyConfigured: boolean;
  blockedPrivateNetworkHosts: boolean;
  blockingReasons: string[];
}

export interface GenLayerReadinessStatus {
  rpcUrlConfigured: boolean;
  contractAddressConfigured: boolean;
  walletConnectProjectIdConfigured: boolean;
  stateVerificationCapable: boolean;
  networkLabel: string;
  blockingReasons: string[];
}

export interface PlatformReadinessStatus {
  runtimeMode: LexNetRuntimeMode;
  auth: AuthReadiness;
  persistence: PersistenceReadiness;
  evidencePolicy: EvidencePolicyStatus;
  genLayer: GenLayerReadinessStatus;
  storeMode: "filesystem";
  persistenceMode: PlatformPersistenceMode;
  productionBlockers: string[];
  blockingReasons: string[];
}

export function getLexNetRuntimeMode(env: PlatformReadinessEnv): LexNetRuntimeMode {
  if (env.LEXNET_RUNTIME_MODE === "pilot" || env.LEXNET_RUNTIME_MODE === "production") {
    return env.LEXNET_RUNTIME_MODE;
  }

  return "local-demo";
}

export function buildAuthReadiness(env: PlatformReadinessEnv): AuthReadiness {
  const mode = getLexNetRuntimeMode(env);
  const demoPrivateApiEnabled = env.LEXNET_ENABLE_DEMO_PRIVATE_API === "true";
  const demoPrivateApiTokenConfigured = Boolean(env.LEXNET_DEMO_PRIVATE_API_TOKEN);
  const productionAuthProvider = env.LEXNET_PRODUCTION_AUTH_PROVIDER || undefined;
  const productionAuthConfigured = Boolean(productionAuthProvider);
  const blockingReasons: string[] = [];

  if (mode !== "local-demo" && !productionAuthConfigured) {
    blockingReasons.push("Production authentication is not configured.");
  }

  if (mode === "production" && demoPrivateApiEnabled && !productionAuthConfigured) {
    blockingReasons.push("Production mode cannot rely on demo-private API authorization only.");
  }

  return {
    mode,
    demoPrivateApiEnabled,
    demoPrivateApiTokenConfigured,
    productionAuthProvider,
    productionAuthConfigured,
    mutatingRoutesAllowed: mode !== "production" || productionAuthConfigured,
    blockingReasons,
  };
}

export function buildPersistenceReadiness(env: PlatformReadinessEnv): PersistenceReadiness {
  const mode = getLexNetRuntimeMode(env);
  const managedDatabaseUrlConfigured = Boolean(env.LEXNET_MANAGED_DATABASE_URL);
  const managedPersistenceProviderConfigured = Boolean(env.LEXNET_MANAGED_PERSISTENCE_PROVIDER);
  const managedPersistenceConfigured = managedDatabaseUrlConfigured || managedPersistenceProviderConfigured;
  const blockingReasons: string[] = [];

  if (mode === "production" && !managedPersistenceConfigured) {
    blockingReasons.push("Managed persistence is not configured.");
  }

  if (mode === "pilot") {
    blockingReasons.push("Local filesystem persistence is pilot infrastructure, not production infrastructure.");
  }

  return {
    mode: mode === "production"
      ? managedPersistenceConfigured
        ? "managed-configured"
        : "managed-missing"
      : "filesystem-local",
    filesystemPersistenceAllowed: mode !== "production",
    managedPersistenceConfigured,
    managedPersistenceProviderConfigured,
    managedDatabaseUrlConfigured,
    blockingReasons,
  };
}

export function buildEvidencePolicyStatus(env: PlatformReadinessEnv): EvidencePolicyStatus {
  const mode = getLexNetRuntimeMode(env);
  const retentionPolicyConfigured = Boolean(env.LEXNET_EVIDENCE_RETENTION_POLICY);
  const blockingReasons: string[] = [];

  if (mode === "production" && !retentionPolicyConfigured) {
    blockingReasons.push("Evidence retention policy is not configured.");
  }

  return {
    allowPublicHttpsOnly: true,
    rawEvidenceStorage: "disabled",
    retentionPolicyConfigured,
    blockedPrivateNetworkHosts: true,
    blockingReasons,
  };
}

export function buildGenLayerReadinessStatus(env: PlatformReadinessEnv): GenLayerReadinessStatus {
  const readiness = getLexNetContractReadiness({ env, walletConnected: true });

  return {
    rpcUrlConfigured: Boolean(env.NEXT_PUBLIC_GENLAYER_RPC_URL),
    contractAddressConfigured: Boolean(env.NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS),
    walletConnectProjectIdConfigured: Boolean(env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID),
    stateVerificationCapable: readiness.isReady,
    networkLabel: readiness.networkLabel,
    blockingReasons: readiness.blockingReasons,
  };
}

function productionOnlyReasons(status: {
  auth: AuthReadiness;
  persistence: PersistenceReadiness;
  evidencePolicy: EvidencePolicyStatus;
}): string[] {
  return [
    ...status.auth.blockingReasons,
    ...status.persistence.blockingReasons,
    ...status.evidencePolicy.blockingReasons,
  ];
}

export function buildPlatformReadinessStatus(env: PlatformReadinessEnv): PlatformReadinessStatus {
  const runtimeMode = getLexNetRuntimeMode(env);
  const auth = buildAuthReadiness(env);
  const persistence = buildPersistenceReadiness(env);
  const evidencePolicy = buildEvidencePolicyStatus(env);
  const genLayer = buildGenLayerReadinessStatus(env);
  const productionBlockers = runtimeMode === "production"
    ? productionOnlyReasons({ auth, persistence, evidencePolicy })
    : [];

  return {
    runtimeMode,
    auth,
    persistence,
    evidencePolicy,
    genLayer,
    storeMode: "filesystem",
    persistenceMode: persistence.mode,
    productionBlockers,
    blockingReasons: [
      ...auth.blockingReasons,
      ...persistence.blockingReasons,
      ...evidencePolicy.blockingReasons,
      ...genLayer.blockingReasons,
    ],
  };
}
```

- [ ] **Step 4: Delegate `buildSecurityStatus()` to readiness helpers**

Replace the `SecurityStatus` interface and `SecurityStatusEnv`/`buildSecurityStatus()` implementation in `frontend/src/lib/platform/api.ts` with this import and type alias near the top:

```ts
import {
  buildPlatformReadinessStatus,
  type PlatformReadinessEnv,
  type PlatformReadinessStatus,
} from "./readiness";

export type SecurityStatus = PlatformReadinessStatus & {
  genLayerRpcUrlConfigured: boolean;
  contractAddressConfigured: boolean;
  walletConnectProjectIdConfigured: boolean;
  demoPrivateApiEnabled: boolean;
  demoPrivateApiTokenConfigured: boolean;
  productionAuthConfigured: boolean;
};
```

Then add this function near `resetRateLimitForTests()`:

```ts
export function buildSecurityStatus(env: PlatformReadinessEnv): SecurityStatus {
  const status = buildPlatformReadinessStatus(env);

  return {
    ...status,
    genLayerRpcUrlConfigured: status.genLayer.rpcUrlConfigured,
    contractAddressConfigured: status.genLayer.contractAddressConfigured,
    walletConnectProjectIdConfigured: status.genLayer.walletConnectProjectIdConfigured,
    demoPrivateApiEnabled: status.auth.demoPrivateApiEnabled,
    demoPrivateApiTokenConfigured: status.auth.demoPrivateApiTokenConfigured,
    productionAuthConfigured: status.auth.productionAuthConfigured,
  };
}
```

Remove the old `SecurityStatusEnv` interface and old `buildSecurityStatus()` body from `frontend/src/lib/platform/api.ts`.

- [ ] **Step 5: Run readiness tests and verify they pass**

Run from `frontend`:

```bash
npm run test:platform
```

Expected: PASS.

- [ ] **Step 6: Commit readiness helpers**

```bash
git add frontend/src/lib/platform/readiness.ts frontend/src/lib/platform/api.ts frontend/tests/platform.test.ts
git commit -m "feat: add production readiness helpers"
```

## Task 2: Production Auth Gate for Mutating Demo-Private Routes

**Files:**
- Modify: `frontend/src/lib/platform/auth.ts`
- Test: `frontend/tests/platform.test.ts`

- [ ] **Step 1: Write failing auth gate tests**

Add this import to the existing auth import in `frontend/tests/platform.test.ts`:

```ts
import {
  authorizeDemoPrivateApi,
  isDemoOperatorRequest,
} from "../src/lib/platform/auth";
```

If the import already exists on one line, keep it and add no duplicate.

Add these tests near the existing demo-private auth tests:

```ts
test("authorizeDemoPrivateApi rejects production demo-private mutation without production auth", () => {
  const request = new Request("http://localhost/api/passports", {
    method: "POST",
    headers: { "x-lexnet-operator-id": "operator-demo" },
  });
  const authorization = authorizeDemoPrivateApi(
    request,
    {
      LEXNET_RUNTIME_MODE: "production",
      LEXNET_ENABLE_DEMO_PRIVATE_API: "true",
    },
    createDefaultPlatformStore(),
  );

  assert.equal(authorization.authorized, false);
  if (!authorization.authorized) {
    assert.equal(authorization.response.status, 403);
  }
});

test("authorizeDemoPrivateApi allows production read when production auth provider is configured", () => {
  const request = new Request("http://localhost/api/passports", {
    method: "POST",
    headers: { "x-lexnet-operator-id": "operator-demo" },
  });
  const authorization = authorizeDemoPrivateApi(
    request,
    {
      LEXNET_RUNTIME_MODE: "production",
      LEXNET_ENABLE_DEMO_PRIVATE_API: "true",
      LEXNET_PRODUCTION_AUTH_PROVIDER: "oauth-provider",
    },
    createDefaultPlatformStore(),
  );

  assert.equal(authorization.authorized, true);
});
```

- [ ] **Step 2: Run auth tests and verify they fail**

Run from `frontend`:

```bash
npm run test:platform
```

Expected: FAIL because production mode is not yet enforced by `authorizeDemoPrivateApi()`.

- [ ] **Step 3: Extend auth env and enforce production gate**

Modify `frontend/src/lib/platform/auth.ts`.

Add this import:

```ts
import { buildAuthReadiness } from "./readiness";
```

Extend `DemoPrivateApiEnv`:

```ts
type DemoPrivateApiEnv = {
  [key: string]: string | undefined;
  LEXNET_RUNTIME_MODE?: string;
  LEXNET_ENABLE_DEMO_PRIVATE_API?: string;
  LEXNET_DEMO_PRIVATE_API_TOKEN?: string;
  LEXNET_PRODUCTION_AUTH_PROVIDER?: string;
};
```

Insert this block after the existing `LEXNET_ENABLE_DEMO_PRIVATE_API` check and before `isDemoOperatorRequest()`:

```ts
  const readiness = buildAuthReadiness(env);
  if (!readiness.mutatingRoutesAllowed && request.method !== "GET" && request.method !== "HEAD") {
    return {
      authorized: false,
      response: jsonError("Production authentication is not configured.", 403),
    };
  }
```

- [ ] **Step 4: Run auth tests and verify they pass**

Run from `frontend`:

```bash
npm run test:platform
```

Expected: PASS.

- [ ] **Step 5: Commit auth gate**

```bash
git add frontend/src/lib/platform/auth.ts frontend/tests/platform.test.ts
git commit -m "fix: block production demo-private mutations"
```

## Task 3: Pilot Summary Helper

**Files:**
- Create: `frontend/src/lib/platform/pilot-summary.ts`
- Test: `frontend/tests/platform.test.ts`

- [ ] **Step 1: Write failing pilot summary tests**

Add this import near platform helper imports in `frontend/tests/platform.test.ts`:

```ts
import { buildPilotSummary } from "../src/lib/platform/pilot-summary";
```

Add this test near demo seed tests:

```ts
test("buildPilotSummary counts store records and GenLayer execution statuses", () => {
  const store = buildDemoPlatformStore();
  store.genLayerExecutions.push(
    {
      id: "submitted",
      caseId: "lx-demo-001",
      method: "verify_case",
      status: "submitted",
      contractAddress: "0x1111111111111111111111111111111111111111",
      rpcUrl: "https://studio.genlayer.com/api",
      networkLabel: "Studionet",
      submittedAt: "2026-05-13T00:00:00.000Z",
      blockingReasons: [],
    },
    {
      id: "state-verified",
      caseId: "lx-demo-002",
      method: "verify_case",
      status: "state_verified",
      contractAddress: "0x1111111111111111111111111111111111111111",
      rpcUrl: "https://studio.genlayer.com/api",
      networkLabel: "Studionet",
      submittedAt: "2026-05-13T00:00:00.000Z",
      blockingReasons: [],
    },
  );

  const summary = buildPilotSummary(store, { LEXNET_RUNTIME_MODE: "pilot" });

  assert.equal(summary.runtimeMode, "pilot");
  assert.equal(summary.caseCount, store.cases.length);
  assert.equal(summary.queueCount, store.queue.length);
  assert.equal(summary.publishedPassportCount, store.publishedPassports.length);
  assert.equal(summary.genLayerExecutionCounts.submitted, 1);
  assert.equal(summary.genLayerExecutionCounts.state_verified, 1);
  assert.match(summary.blockingReasons.join("\n"), /Local filesystem persistence is pilot infrastructure/);
});
```

- [ ] **Step 2: Run pilot summary test and verify it fails**

Run from `frontend`:

```bash
npm run test:platform
```

Expected: FAIL because `../src/lib/platform/pilot-summary` does not exist.

- [ ] **Step 3: Implement pilot summary helper**

Create `frontend/src/lib/platform/pilot-summary.ts`:

```ts
import { buildPlatformReadinessStatus, type LexNetRuntimeMode, type PlatformReadinessEnv } from "./readiness";
import type { GenLayerExecutionStatus, PlatformStore } from "./types";

export interface PilotSummary {
  runtimeMode: LexNetRuntimeMode;
  caseCount: number;
  queueCount: number;
  publishedPassportCount: number;
  genLayerExecutionCounts: Record<string, number>;
  blockingReasons: string[];
}

const GENLAYER_STATUSES: GenLayerExecutionStatus[] = [
  "submitted",
  "confirmed",
  "failed",
  "state_verified",
];

export function buildPilotSummary(
  store: PlatformStore,
  env: PlatformReadinessEnv,
): PilotSummary {
  const readiness = buildPlatformReadinessStatus(env);
  const genLayerExecutionCounts: Record<string, number> = Object.fromEntries(
    GENLAYER_STATUSES.map((status) => [status, 0]),
  );

  for (const execution of store.genLayerExecutions) {
    genLayerExecutionCounts[execution.status] = (genLayerExecutionCounts[execution.status] ?? 0) + 1;
  }

  return {
    runtimeMode: readiness.runtimeMode,
    caseCount: store.cases.length,
    queueCount: store.queue.length,
    publishedPassportCount: store.publishedPassports.filter((passport) => passport.status === "published").length,
    genLayerExecutionCounts,
    blockingReasons: readiness.blockingReasons,
  };
}
```

- [ ] **Step 4: Run pilot summary test and verify it passes**

Run from `frontend`:

```bash
npm run test:platform
```

Expected: PASS.

- [ ] **Step 5: Commit pilot summary helper**

```bash
git add frontend/src/lib/platform/pilot-summary.ts frontend/tests/platform.test.ts
git commit -m "feat: add pilot summary helper"
```

## Task 4: Pilot Check Script

**Files:**
- Create: `frontend/scripts/pilot-check.ts`
- Modify: `frontend/package.json`
- Test: `frontend/tests/platform.test.ts`

- [ ] **Step 1: Write failing pilot check utility tests**

Add this import near script imports in `frontend/tests/platform.test.ts`:

```ts
import {
  findForbiddenStoreSecretKeys,
  isPathIgnoredByGitOutput,
  shouldFailPilotCheck,
} from "../scripts/pilot-check";
```

Update the `package scripts expose demo seed, reset, and dev commands` test to include:

```ts
  assert.equal(packageJson.scripts["pilot:check"], "tsx scripts/pilot-check.ts");
```

Add these tests near package/script tests:

```ts
test("pilot check detects forbidden secret-like keys in store JSON", () => {
  const findings = findForbiddenStoreSecretKeys({
    cases: [],
    nested: {
      privateKey: "0xabc",
      allowed: "value",
      deeper: [{ mnemonic: "words" }],
    },
  });

  assert.deepEqual(findings, ["nested.privateKey", "nested.deeper.0.mnemonic"]);
});

test("pilot check failure is limited to production blockers and forbidden secrets", () => {
  assert.equal(shouldFailPilotCheck("local-demo", ["warning"], []), false);
  assert.equal(shouldFailPilotCheck("pilot", ["warning"], []), false);
  assert.equal(shouldFailPilotCheck("production", ["blocker"], []), true);
  assert.equal(shouldFailPilotCheck("pilot", [], ["privateKey"]), true);
});

test("pilot check parses git ignored output for local data directory", () => {
  assert.equal(isPathIgnoredByGitOutput(".lexnet-data/"), true);
  assert.equal(isPathIgnoredByGitOutput(""), false);
});
```

- [ ] **Step 2: Run pilot check tests and verify they fail**

Run from `frontend`:

```bash
npm run test:platform
```

Expected: FAIL because `../scripts/pilot-check` does not exist and `pilot:check` script is missing.

- [ ] **Step 3: Add package script**

Modify `frontend/package.json` scripts:

```json
"pilot:check": "tsx scripts/pilot-check.ts"
```

Place it after `demo:genlayer-readiness`.

- [ ] **Step 4: Implement pilot check script**

Create `frontend/scripts/pilot-check.ts`:

```ts
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

import { buildPilotSummary } from "../src/lib/platform/pilot-summary";
import { buildPlatformReadinessStatus, type LexNetRuntimeMode } from "../src/lib/platform/readiness";
import { DEFAULT_PLATFORM_STORE_PATH, readPlatformStore } from "../src/lib/platform/store";

const FORBIDDEN_SECRET_KEYS = new Set(["privateKey", "seedPhrase", "mnemonic", "walletSecret"]);

export function findForbiddenStoreSecretKeys(value: unknown, path: string[] = []): string[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findForbiddenStoreSecretKeys(item, [...path, String(index)]));
  }

  const findings: string[] = [];
  for (const [key, nestedValue] of Object.entries(value)) {
    const nextPath = [...path, key];
    if (FORBIDDEN_SECRET_KEYS.has(key)) {
      findings.push(nextPath.join("."));
    }
    findings.push(...findForbiddenStoreSecretKeys(nestedValue, nextPath));
  }

  return findings;
}

export function shouldFailPilotCheck(
  mode: LexNetRuntimeMode,
  productionBlockers: string[],
  forbiddenSecretKeys: string[],
): boolean {
  return forbiddenSecretKeys.length > 0 || (mode === "production" && productionBlockers.length > 0);
}

export function isPathIgnoredByGitOutput(output: string): boolean {
  return output.trim().length > 0;
}

function getGitIgnoredOutput(): string {
  try {
    return execFileSync("git", ["check-ignore", ".lexnet-data/"], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return "";
  }
}

async function readStoreJsonForSecretScan(): Promise<unknown | null> {
  if (!existsSync(DEFAULT_PLATFORM_STORE_PATH)) {
    return null;
  }

  return JSON.parse(await readFile(DEFAULT_PLATFORM_STORE_PATH, "utf8")) as unknown;
}

async function main() {
  const readiness = buildPlatformReadinessStatus(process.env);
  const store = await readPlatformStore();
  const summary = buildPilotSummary(store, process.env);
  const storeJson = await readStoreJsonForSecretScan();
  const forbiddenSecretKeys = storeJson ? findForbiddenStoreSecretKeys(storeJson) : [];
  const gitIgnored = isPathIgnoredByGitOutput(getGitIgnoredOutput());

  console.log(`Runtime mode: ${readiness.runtimeMode}`);
  console.log(`Auth mutating routes allowed: ${readiness.auth.mutatingRoutesAllowed}`);
  console.log(`Persistence mode: ${readiness.persistence.mode}`);
  console.log(`Evidence retention configured: ${readiness.evidencePolicy.retentionPolicyConfigured}`);
  console.log(`GenLayer state verification capable: ${readiness.genLayer.stateVerificationCapable}`);
  console.log(`.lexnet-data ignored by git: ${gitIgnored}`);
  console.log(`Case count: ${summary.caseCount}`);
  console.log(`Queue count: ${summary.queueCount}`);
  console.log(`Published passport count: ${summary.publishedPassportCount}`);
  console.log(`GenLayer execution counts: ${JSON.stringify(summary.genLayerExecutionCounts)}`);

  for (const reason of readiness.blockingReasons) {
    console.log(`Readiness warning: ${reason}`);
  }

  for (const finding of forbiddenSecretKeys) {
    console.log(`Forbidden secret-like key: ${finding}`);
  }

  if (!gitIgnored) {
    console.log("Readiness warning: .lexnet-data/ is not ignored by git.");
  }

  if (shouldFailPilotCheck(readiness.runtimeMode, readiness.productionBlockers, forbiddenSecretKeys)) {
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
```

- [ ] **Step 5: Run pilot check tests and verify they pass**

Run from `frontend`:

```bash
npm run test:platform
```

Expected: PASS.

- [ ] **Step 6: Run pilot check in local-demo mode**

Run from `frontend`:

```bash
npm run pilot:check
```

Expected: exit 0. Output includes runtime mode, auth, persistence, evidence policy, GenLayer readiness, `.lexnet-data` ignored status, counts, and warnings.

- [ ] **Step 7: Commit pilot check script**

```bash
git add frontend/scripts/pilot-check.ts frontend/package.json frontend/tests/platform.test.ts
git commit -m "feat: add pilot readiness check"
```

## Task 5: Pilot Prepare Script

**Files:**
- Create: `frontend/scripts/pilot-prepare.ts`
- Modify: `frontend/package.json`
- Test: `frontend/tests/platform.test.ts`

- [ ] **Step 1: Write failing pilot prepare tests**

Add this import near script imports in `frontend/tests/platform.test.ts`:

```ts
import { canRunPilotPrepare } from "../scripts/pilot-prepare";
```

Update the package scripts test to include:

```ts
  assert.equal(packageJson.scripts["pilot:prepare"], "tsx scripts/pilot-prepare.ts");
```

Add this test near other pilot script tests:

```ts
test("pilot prepare refuses production mode", () => {
  assert.equal(canRunPilotPrepare({ LEXNET_RUNTIME_MODE: "local-demo" }), true);
  assert.equal(canRunPilotPrepare({ LEXNET_RUNTIME_MODE: "pilot" }), true);
  assert.equal(canRunPilotPrepare({ LEXNET_RUNTIME_MODE: "production" }), false);
});
```

- [ ] **Step 2: Run pilot prepare tests and verify they fail**

Run from `frontend`:

```bash
npm run test:platform
```

Expected: FAIL because `../scripts/pilot-prepare` does not exist and `pilot:prepare` script is missing.

- [ ] **Step 3: Add package script**

Modify `frontend/package.json` scripts:

```json
"pilot:prepare": "tsx scripts/pilot-prepare.ts"
```

Place it after `pilot:check`.

- [ ] **Step 4: Implement pilot prepare script**

Create `frontend/scripts/pilot-prepare.ts`:

```ts
import { buildPilotSummary } from "../src/lib/platform/pilot-summary";
import { getLexNetRuntimeMode, type PlatformReadinessEnv } from "../src/lib/platform/readiness";
import { readPlatformStore } from "../src/lib/platform/store";
import {
  getDemoSeedPublicPassportSlugs,
  resetDemoPlatformStore,
  seedDemoPlatformStore,
} from "../src/lib/platform/demo-seed";
import { buildGenLayerReadinessStatus } from "../src/lib/platform/readiness";

export function canRunPilotPrepare(env: PlatformReadinessEnv): boolean {
  return getLexNetRuntimeMode(env) !== "production";
}

async function main() {
  if (!canRunPilotPrepare(process.env)) {
    console.error("pilot:prepare refuses to run in production mode.");
    process.exitCode = 1;
    return;
  }

  await resetDemoPlatformStore();
  await seedDemoPlatformStore();

  const store = await readPlatformStore();
  const summary = buildPilotSummary(store, process.env);
  const genLayer = buildGenLayerReadinessStatus(process.env);

  console.log(`Runtime mode: ${summary.runtimeMode}`);
  console.log(`Seeded case count: ${summary.caseCount}`);
  console.log(`Seeded queue count: ${summary.queueCount}`);
  console.log(`Seeded published passport count: ${summary.publishedPassportCount}`);
  console.log(`Public passport slugs: ${getDemoSeedPublicPassportSlugs().join(", ")}`);
  console.log(`GenLayer state verification capable: ${genLayer.stateVerificationCapable}`);

  for (const reason of summary.blockingReasons) {
    console.log(`Readiness warning: ${reason}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
```

- [ ] **Step 5: Run pilot prepare tests and verify they pass**

Run from `frontend`:

```bash
npm run test:platform
```

Expected: PASS.

- [ ] **Step 6: Run pilot prepare in local-demo mode**

Run from `frontend`:

```bash
npm run pilot:prepare
```

Expected: exit 0. Output includes seeded case count, queue count, published passport count, public passport slugs, and GenLayer readiness.

- [ ] **Step 7: Run pilot check after prepare**

Run from `frontend`:

```bash
npm run pilot:check
```

Expected: exit 0 in local-demo mode.

- [ ] **Step 8: Commit pilot prepare script**

```bash
git add frontend/scripts/pilot-prepare.ts frontend/package.json frontend/tests/platform.test.ts
git commit -m "feat: add pilot prepare script"
```

## Task 6: Expand Security Status Route

**Files:**
- Modify: `frontend/src/app/api/security/status/route.ts`
- Test: `frontend/tests/platform.test.ts`

- [ ] **Step 1: Inspect current security status route**

Open `frontend/src/app/api/security/status/route.ts`. It should call `buildSecurityStatus(process.env)` or a helper from `platform/api.ts`.

- [ ] **Step 2: Write or update route test if route is directly tested**

If `frontend/tests/platform.test.ts` already imports the route handler, update that test to assert:

```ts
assert.equal(payload.runtimeMode, "production");
assert.equal(payload.auth.productionAuthConfigured, true);
assert.equal(payload.persistence.managedPersistenceConfigured, true);
assert.equal(payload.evidencePolicy.retentionPolicyConfigured, true);
assert.equal(payload.genLayer.stateVerificationCapable, true);
assert.equal(JSON.stringify(payload).includes("postgres://"), false);
```

If no route handler test exists, do not add a brittle Next route import test; the Task 1 `buildPlatformReadinessStatus omits raw secret values and connection strings` test is the route-safe coverage.

- [ ] **Step 3: Ensure route delegates to expanded status helper**

Update `frontend/src/app/api/security/status/route.ts` to this shape if needed:

```ts
import { jsonOk, buildSecurityStatus } from "@/lib/platform/api";

export async function GET() {
  return jsonOk(buildSecurityStatus(process.env));
}
```

- [ ] **Step 4: Run platform tests**

Run from `frontend`:

```bash
npm run test:platform
```

Expected: PASS.

- [ ] **Step 5: Commit security route expansion**

```bash
git add frontend/src/app/api/security/status/route.ts frontend/tests/platform.test.ts
git commit -m "feat: expand security readiness status"
```

## Task 7: Pilot Runbook and Project Documentation

**Files:**
- Create: `docs/PILOT_RUNBOOK.md`
- Modify: `README.md`
- Modify: `ARCHITECTURE.md`
- Modify: `docs/CURRENT_MAP.md`

- [ ] **Step 1: Create pilot runbook**

Create `docs/PILOT_RUNBOOK.md`:

```md
# LexNet Pilot Runbook

LexNet pilot mode is for controlled operator demos and early pilot workflows. It keeps local filesystem persistence and demo-private authorization, while reporting the production blockers that must be resolved before real commerce use.

## Local Pilot Setup

From the repository or worktree root:

```bash
npm --prefix frontend install
npm --prefix frontend run pilot:prepare
npm --prefix frontend run demo:dev
```

The dev server prefers `http://localhost:3002` and falls back to `http://localhost:3003` when using `demo:dev`.

## Environment Checklist

```bash
LEXNET_RUNTIME_MODE=pilot
LEXNET_ENABLE_DEMO_PRIVATE_API=true
LEXNET_DEMO_PRIVATE_API_TOKEN=
LEXNET_PRODUCTION_AUTH_PROVIDER=
LEXNET_MANAGED_DATABASE_URL=
LEXNET_MANAGED_PERSISTENCE_PROVIDER=
LEXNET_EVIDENCE_RETENTION_POLICY=
NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS=
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_GENLAYER_NETWORK_LABEL=Studionet
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

Pilot mode may use filesystem persistence and demo-private auth. Production mode must configure production auth, managed persistence, and evidence retention policy before mutating routes are allowed.

## Seed, Reset, Backup, and Restore

```bash
npm --prefix frontend run pilot:prepare
npm --prefix frontend run demo:backup
npm --prefix frontend run demo:restore -- <backup-path>
npm --prefix frontend run demo:reset
```

`pilot:prepare` resets and reseeds `.lexnet-data/store.json`. It refuses to run when `LEXNET_RUNTIME_MODE=production`.

## GenLayer Proof Workflow

1. Configure `NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS` and `NEXT_PUBLIC_GENLAYER_RPC_URL`.
2. Open a case detail page.
3. Submit `verify_case` from the GenLayer Execution Proof panel.
4. Treat the transaction hash as submission evidence only.
5. Use Check contract state to read `get_case(case_id)`.
6. LexNet marks a proof as contract-state verified only when contract state contains `verification_report`.

LexNet does not custody funds, execute payouts, move real value, or claim settlement finality.

## Readiness Commands

```bash
npm --prefix frontend run pilot:check
npm --prefix frontend run test:platform
npm --prefix frontend run test:domain
npm --prefix frontend exec tsc -- --noEmit
npm --prefix frontend run build
```

`pilot:check` exits non-zero for production-mode blockers or forbidden secret-like keys in the local store. Local-demo and pilot readiness warnings do not fail the command.

## Known Production Blockers

- Production authentication provider is not implemented.
- Managed persistence is not selected or provisioned.
- Evidence retention policy must be configured.
- Managed backup, monitoring, and disaster recovery are not configured.
- GenLayer execution needs audited production operations.
- Payment custody and settlement transfer paths are out of scope.

## Forbidden Claims and Data Boundaries

Do not claim settled, paid, funds released, escrow completed, or final on-chain settlement from local verification or GenLayer submission alone.

Do not store private keys, seed phrases, mnemonics, wallet secrets, or raw evidence payloads in `.lexnet-data/store.json`.

Public passports must remain privacy-safe and must not expose raw parties, evidence URLs, case IDs, audit events, operators, workspace memberships, or unpublished passport records.
```

- [ ] **Step 2: Update README pilot section**

Add this section after `Recommended Demo Workflow` in `README.md`:

```md
## Pilot Readiness Workflow

For a controlled local pilot package:

```bash
npm --prefix frontend run pilot:prepare
npm --prefix frontend run pilot:check
```

`pilot:prepare` resets and reseeds local `.lexnet-data/store.json` with deterministic pilot/demo records and refuses to run in `LEXNET_RUNTIME_MODE=production`.

`pilot:check` reports runtime mode, auth readiness, persistence readiness, evidence policy readiness, GenLayer state verification readiness, local store counts, and forbidden secret-like keys. It fails only for production-mode blockers or forbidden secret-like keys.

See `docs/PILOT_RUNBOOK.md` for the full operator runbook.
```

- [ ] **Step 3: Update architecture production boundary**

Add these bullets under `## Production Boundary` in `ARCHITECTURE.md`:

```md
The production readiness boundary now reports runtime mode, auth readiness, persistence readiness, evidence policy readiness, GenLayer state verification capability, and production blockers through `/api/security/status` and `pilot:check`.

`LEXNET_RUNTIME_MODE=production` blocks demo-private-only mutating routes unless `LEXNET_PRODUCTION_AUTH_PROVIDER` is configured. Production mode also requires managed persistence configuration and evidence retention policy before the readiness check is clear.
```

- [ ] **Step 4: Update current map commands and active files**

Update `docs/CURRENT_MAP.md`:

Add active files under Platform Backend Layer:

```md
- `frontend/src/lib/platform/readiness.ts` — runtime mode, auth, persistence, evidence policy, GenLayer readiness, and public-safe security status helpers.
- `frontend/src/lib/platform/pilot-summary.ts` — pilot/package summary counts using platform store data and readiness helpers.
```

Add scripts under Additional active frontend package scripts:

```bash
npm --prefix frontend run pilot:check
npm --prefix frontend run pilot:prepare
```

Add env vars under demo/private backend config:

```bash
LEXNET_RUNTIME_MODE=local-demo
LEXNET_MANAGED_DATABASE_URL=
LEXNET_MANAGED_PERSISTENCE_PROVIDER=
LEXNET_EVIDENCE_RETENTION_POLICY=
```

- [ ] **Step 5: Commit docs**

```bash
git add docs/PILOT_RUNBOOK.md README.md ARCHITECTURE.md docs/CURRENT_MAP.md
git commit -m "docs: add pilot runbook"
```

## Task 8: Final Verification

**Files:**
- No source edits expected unless verification finds a bug.

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

Run from `frontend`:

```bash
npm exec tsc -- --noEmit
```

Expected: PASS.

- [ ] **Step 4: Run production build**

Run from `frontend`:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Run pilot check**

Run from `frontend`:

```bash
npm run pilot:check
```

Expected: PASS in local-demo mode.

- [ ] **Step 6: Inspect git status**

Run from `frontend`:

```bash
git status --short
```

Expected: no uncommitted source changes, unless `.lexnet-data/` exists and is ignored.

## Self-Review

- Spec coverage: Runtime mode, auth readiness, persistence readiness, evidence policy readiness, security status expansion, pilot summary, pilot check, pilot prepare, runbook documentation, and verification commands are covered by Tasks 1-8.
- Placeholder scan: This plan contains no TBD/TODO/fill-in placeholders; all created files and test snippets include exact content.
- Type consistency: `LexNetRuntimeMode`, `AuthReadiness`, `PlatformPersistenceMode`, `EvidencePolicyStatus`, `PilotSummary`, `PlatformReadinessEnv`, and helper names are consistent across tasks.
