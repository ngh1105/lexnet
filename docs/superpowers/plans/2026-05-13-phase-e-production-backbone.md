# Phase E Production Backbone v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce honest production-backbone boundaries for auth, persistence, evidence policy, and readiness without deploying infrastructure, choosing a database vendor, or adding payment/settlement movement.

**Architecture:** Add small provider-neutral helpers next to the platform backend layer: `production-auth.ts` verifies trusted-header HMAC requests, `persistence-adapter.ts` reports filesystem vs managed-enforced storage status, and `evidence-policy.ts` validates evidence URLs before normalization. Existing API routes keep local/pilot behavior but production mutations migrate to `authorizePlatformMutation()`, while readiness and pilot checks distinguish configured controls from enforced controls.

**Tech Stack:** Next.js App Router, TypeScript, Node `crypto`, Node `URL`, filesystem platform store, `tsx --test`, existing platform/auth/readiness/store patterns.

---

## File Structure

- Create `frontend/src/lib/platform/production-auth.ts` for HMAC trusted-header auth verification and production auth context types.
- Modify `frontend/src/lib/platform/auth.ts` to expose `authorizePlatformMutation()` while preserving demo-private auth for local/pilot.
- Create `frontend/src/lib/platform/persistence-adapter.ts` for production-safe persistence adapter status.
- Create `frontend/src/lib/platform/evidence-policy.ts` for shared URL policy enforcement.
- Modify `frontend/src/lib/lexnet-domain.ts` to use the evidence URL policy in normalization/build pack paths.
- Modify `frontend/src/lib/platform/readiness.ts` to expose configured-vs-enforced auth/persistence semantics and production blockers.
- Modify `frontend/scripts/pilot-check.ts` to print production auth/persistence enforcement status.
- Modify mutating route handlers: `frontend/src/app/api/passports/route.ts`, `frontend/src/app/api/admin/backup/route.ts`, and `frontend/src/app/api/genlayer/verify-case/route.ts`.
- Modify `frontend/tests/platform.test.ts` for all Phase E behavior.
- Modify docs: `README.md`, `ARCHITECTURE.md`, `docs/CURRENT_MAP.md`, `docs/PILOT_RUNBOOK.md`.

## Task 1: Production Trusted-Header Auth Boundary

**Files:**
- Create: `frontend/src/lib/platform/production-auth.ts`
- Modify: `frontend/tests/platform.test.ts`

- [ ] **Step 1: Add failing production auth tests**

Add this import block near platform auth imports in `frontend/tests/platform.test.ts`:

```ts
import {
  buildProductionAuthSignature,
  resolveProductionAuthContext,
} from "../src/lib/platform/production-auth";
```

Add these tests near existing auth tests:

```ts
test("resolveProductionAuthContext accepts valid trusted-header HMAC", () => {
  const timestamp = "1770000000";
  const request = new Request("https://lexnet.example/api/passports", {
    method: "POST",
    headers: {
      "x-lexnet-production-operator-id": "operator-demo",
      "x-lexnet-production-auth-timestamp": timestamp,
      "x-lexnet-production-auth-signature": buildProductionAuthSignature({
        method: "POST",
        pathname: "/api/passports",
        operatorId: "operator-demo",
        timestamp,
        secret: "production-secret",
      }),
    },
  });

  const context = resolveProductionAuthContext(
    request,
    {
      LEXNET_PRODUCTION_AUTH_MODE: "trusted-header",
      LEXNET_PRODUCTION_AUTH_SECRET: "production-secret",
      LEXNET_PRODUCTION_AUTH_CLOCK_SKEW_SECONDS: "300",
    },
    1770000000,
  );

  assert.equal(context.authorized, true);
  if (context.authorized) {
    assert.equal(context.operatorId, "operator-demo");
    assert.equal(context.mode, "trusted-header");
  }
});

test("resolveProductionAuthContext rejects invalid signature without leaking secret", () => {
  const request = new Request("https://lexnet.example/api/passports", {
    method: "POST",
    headers: {
      "x-lexnet-production-operator-id": "operator-demo",
      "x-lexnet-production-auth-timestamp": "1770000000",
      "x-lexnet-production-auth-signature": "bad-signature",
    },
  });

  const context = resolveProductionAuthContext(
    request,
    {
      LEXNET_PRODUCTION_AUTH_MODE: "trusted-header",
      LEXNET_PRODUCTION_AUTH_SECRET: "production-secret",
    },
    1770000000,
  );

  assert.equal(context.authorized, false);
  if (!context.authorized) {
    assert.equal(context.status, 401);
    assert.equal(context.reason.includes("production-secret"), false);
  }
});

test("resolveProductionAuthContext rejects stale timestamps", () => {
  const timestamp = "1769999000";
  const request = new Request("https://lexnet.example/api/passports", {
    method: "POST",
    headers: {
      "x-lexnet-production-operator-id": "operator-demo",
      "x-lexnet-production-auth-timestamp": timestamp,
      "x-lexnet-production-auth-signature": buildProductionAuthSignature({
        method: "POST",
        pathname: "/api/passports",
        operatorId: "operator-demo",
        timestamp,
        secret: "production-secret",
      }),
    },
  });

  const context = resolveProductionAuthContext(
    request,
    {
      LEXNET_PRODUCTION_AUTH_MODE: "trusted-header",
      LEXNET_PRODUCTION_AUTH_SECRET: "production-secret",
      LEXNET_PRODUCTION_AUTH_CLOCK_SKEW_SECONDS: "300",
    },
    1770000000,
  );

  assert.equal(context.authorized, false);
  if (!context.authorized) {
    assert.match(context.reason, /timestamp/i);
  }
});
```

- [ ] **Step 2: Run tests and verify failure**

Run from repo root:

```bash
npm --prefix frontend run test:platform
```

Expected: FAIL because `../src/lib/platform/production-auth` does not exist.

- [ ] **Step 3: Implement production auth helper**

Create `frontend/src/lib/platform/production-auth.ts`:

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

export type ProductionAuthMode = "trusted-header";

export interface ProductionAuthEnv {
  [key: string]: string | undefined;
  LEXNET_PRODUCTION_AUTH_MODE?: string;
  LEXNET_PRODUCTION_AUTH_SECRET?: string;
  LEXNET_PRODUCTION_AUTH_CLOCK_SKEW_SECONDS?: string;
}

export interface ProductionAuthSignatureInput {
  method: string;
  pathname: string;
  operatorId: string;
  timestamp: string;
  secret: string;
}

export type ProductionAuthContext =
  | { authorized: true; mode: ProductionAuthMode; operatorId: string }
  | { authorized: false; status: number; reason: string };

const DEFAULT_CLOCK_SKEW_SECONDS = 300;

export function buildProductionAuthPayload({
  method,
  pathname,
  operatorId,
  timestamp,
}: Omit<ProductionAuthSignatureInput, "secret">): string {
  return [method.toUpperCase(), pathname, operatorId, timestamp].join("\n");
}

export function buildProductionAuthSignature(input: ProductionAuthSignatureInput): string {
  return createHmac("sha256", input.secret)
    .update(buildProductionAuthPayload(input))
    .digest("hex");
}

function parseClockSkew(env: ProductionAuthEnv): number {
  const parsed = Number(env.LEXNET_PRODUCTION_AUTH_CLOCK_SKEW_SECONDS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_CLOCK_SKEW_SECONDS;
}

function signaturesMatch(expected: string, actual: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(actual)) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(actual, "hex");
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

export function isProductionAuthConfigured(env: ProductionAuthEnv): boolean {
  return env.LEXNET_PRODUCTION_AUTH_MODE === "trusted-header" && Boolean(env.LEXNET_PRODUCTION_AUTH_SECRET);
}

export function resolveProductionAuthContext(
  request: Request,
  env: ProductionAuthEnv,
  nowSeconds = Math.floor(Date.now() / 1000),
): ProductionAuthContext {
  if (env.LEXNET_PRODUCTION_AUTH_MODE !== "trusted-header") {
    return { authorized: false, status: 403, reason: "Production authentication mode is not configured." };
  }

  const secret = env.LEXNET_PRODUCTION_AUTH_SECRET;
  if (!secret) {
    return { authorized: false, status: 403, reason: "Production authentication secret is not configured." };
  }

  const operatorId = request.headers.get("x-lexnet-production-operator-id") ?? "";
  const timestamp = request.headers.get("x-lexnet-production-auth-timestamp") ?? "";
  const signature = request.headers.get("x-lexnet-production-auth-signature") ?? "";

  if (!operatorId || !timestamp || !signature) {
    return { authorized: false, status: 401, reason: "Production authentication headers are required." };
  }

  const timestampSeconds = Number(timestamp);
  if (!Number.isInteger(timestampSeconds)) {
    return { authorized: false, status: 401, reason: "Production authentication timestamp is invalid." };
  }

  if (Math.abs(nowSeconds - timestampSeconds) > parseClockSkew(env)) {
    return { authorized: false, status: 401, reason: "Production authentication timestamp is outside the allowed window." };
  }

  const { pathname } = new URL(request.url);
  const expected = buildProductionAuthSignature({
    method: request.method,
    pathname,
    operatorId,
    timestamp,
    secret,
  });

  if (!signaturesMatch(expected, signature)) {
    return { authorized: false, status: 401, reason: "Production authentication signature is invalid." };
  }

  return { authorized: true, mode: "trusted-header", operatorId };
}
```

- [ ] **Step 4: Run tests and verify pass**

```bash
npm --prefix frontend run test:platform
```

Expected: PASS.

- [ ] **Step 5: Commit production auth helper**

```bash
git add frontend/src/lib/platform/production-auth.ts frontend/tests/platform.test.ts
git commit -m "feat: add production auth boundary"
```

## Task 2: Platform Mutation Authorization

**Files:**
- Modify: `frontend/src/lib/platform/auth.ts`
- Modify: `frontend/src/app/api/passports/route.ts`
- Modify: `frontend/src/app/api/admin/backup/route.ts`
- Modify: `frontend/src/app/api/genlayer/verify-case/route.ts`
- Modify: `frontend/tests/platform.test.ts`

- [ ] **Step 1: Add failing mutation authorization tests**

Update the auth import in `frontend/tests/platform.test.ts` to include `authorizePlatformMutation`.

Add tests near auth tests:

```ts
test("authorizePlatformMutation rejects production mutation when only provider name is set", () => {
  const request = new Request("https://lexnet.example/api/passports", {
    method: "POST",
    headers: { "x-lexnet-operator-id": "operator-demo" },
  });
  const authorization = authorizePlatformMutation(
    request,
    {
      LEXNET_RUNTIME_MODE: "production",
      LEXNET_ENABLE_DEMO_PRIVATE_API: "true",
      LEXNET_PRODUCTION_AUTH_PROVIDER: "oauth-provider",
    },
    createDefaultPlatformStore(),
  );

  assert.equal(authorization.authorized, false);
  if (!authorization.authorized) {
    assert.equal(authorization.response.status, 403);
  }
});

test("authorizePlatformMutation accepts production mutation with valid production auth", () => {
  const timestamp = "1770000000";
  const request = new Request("https://lexnet.example/api/passports", {
    method: "POST",
    headers: {
      "x-lexnet-production-operator-id": "operator-demo",
      "x-lexnet-production-auth-timestamp": timestamp,
      "x-lexnet-production-auth-signature": buildProductionAuthSignature({
        method: "POST",
        pathname: "/api/passports",
        operatorId: "operator-demo",
        timestamp,
        secret: "production-secret",
      }),
    },
  });
  const authorization = authorizePlatformMutation(
    request,
    {
      LEXNET_RUNTIME_MODE: "production",
      LEXNET_PRODUCTION_AUTH_MODE: "trusted-header",
      LEXNET_PRODUCTION_AUTH_SECRET: "production-secret",
    },
    createDefaultPlatformStore(),
    1770000000,
  );

  assert.equal(authorization.authorized, true);
  if (authorization.authorized) {
    assert.equal(authorization.operator.id, "operator-demo");
    assert.equal(authorization.authType, "production");
  }
});
```

- [ ] **Step 2: Run tests and verify failure**

```bash
npm --prefix frontend run test:platform
```

Expected: FAIL because `authorizePlatformMutation` is not exported.

- [ ] **Step 3: Implement `authorizePlatformMutation()`**

Modify `frontend/src/lib/platform/auth.ts`:

```ts
import { jsonError } from "./api";
import { buildAuthReadiness, getLexNetRuntimeMode } from "./readiness";
import { resolveProductionAuthContext, type ProductionAuthEnv } from "./production-auth";
import type { PlatformOperator, PlatformStore } from "./types";
```

Extend `DemoPrivateApiEnv`:

```ts
type DemoPrivateApiEnv = ProductionAuthEnv & {
  [key: string]: string | undefined;
  LEXNET_RUNTIME_MODE?: string;
  LEXNET_ENABLE_DEMO_PRIVATE_API?: string;
  LEXNET_DEMO_PRIVATE_API_TOKEN?: string;
  LEXNET_PRODUCTION_AUTH_PROVIDER?: string;
};
```

Add type and function after `authorizeDemoPrivateApi()`:

```ts
export type PlatformMutationAuthorization =
  | { authorized: true; operator: PlatformOperator; authType: "demo-private" | "production" }
  | { authorized: false; response: Response };

export function authorizePlatformMutation(
  request: Request,
  env: DemoPrivateApiEnv,
  store: PlatformStore,
  nowSeconds?: number,
): PlatformMutationAuthorization {
  if (getLexNetRuntimeMode(env) !== "production") {
    const authorization = authorizeDemoPrivateApi(request, env, store);
    return authorization.authorized
      ? { authorized: true, operator: authorization.operator, authType: "demo-private" }
      : authorization;
  }

  const context = resolveProductionAuthContext(request, env, nowSeconds);
  if (!context.authorized) {
    return { authorized: false, response: jsonError(context.reason, context.status) };
  }

  const operator = store.operators.find((candidate) => candidate.id === context.operatorId);
  if (!operator) {
    return { authorized: false, response: jsonError("Unauthorized.", 401) };
  }

  return { authorized: true, operator, authType: "production" };
}
```

Keep `authorizeDemoPrivateApi()` available for local/pilot and read routes.

- [ ] **Step 4: Migrate mutating routes**

In `frontend/src/app/api/passports/route.ts`:

- Keep `GET` using `authorizeDemoPrivateApi()`.
- Change imports to include `authorizePlatformMutation`.
- In `POST` and `PATCH`, replace `authorizeDemoPrivateApi(request, process.env, currentStore)` with `authorizePlatformMutation(request, process.env, currentStore)`.
- Replace `requireDemoOperator(request, draft)` audit lookups with the already resolved `authorization.operator` from the outer scope.

In `frontend/src/app/api/admin/backup/route.ts`:

- Import `authorizePlatformMutation` instead of `authorizeDemoPrivateApi`.
- Use `authorizePlatformMutation(request, process.env, draft)` in the mutation callback.

In `frontend/src/app/api/genlayer/verify-case/route.ts`:

- Import and use `authorizePlatformMutation()` instead of `authorizeDemoPrivateApi()`.

- [ ] **Step 5: Run tests and verify pass**

```bash
npm --prefix frontend run test:platform
```

Expected: PASS.

- [ ] **Step 6: Commit mutation authorization**

```bash
git add frontend/src/lib/platform/auth.ts frontend/src/app/api/passports/route.ts frontend/src/app/api/admin/backup/route.ts frontend/src/app/api/genlayer/verify-case/route.ts frontend/tests/platform.test.ts
git commit -m "fix: require production auth for mutations"
```

## Task 3: Persistence Adapter Status

**Files:**
- Create: `frontend/src/lib/platform/persistence-adapter.ts`
- Modify: `frontend/src/lib/platform/readiness.ts`
- Modify: `frontend/tests/platform.test.ts`

- [ ] **Step 1: Add failing persistence adapter tests**

Add import:

```ts
import { getPlatformStoreAdapterStatus } from "../src/lib/platform/persistence-adapter";
```

Add tests near readiness tests:

```ts
test("getPlatformStoreAdapterStatus allows filesystem outside production", () => {
  const status = getPlatformStoreAdapterStatus({ LEXNET_RUNTIME_MODE: "pilot" });

  assert.equal(status.mode, "filesystem-local");
  assert.equal(status.canRead, true);
  assert.equal(status.canMutate, true);
});

test("getPlatformStoreAdapterStatus blocks production managed adapter until enforced", () => {
  const status = getPlatformStoreAdapterStatus({
    LEXNET_RUNTIME_MODE: "production",
    LEXNET_MANAGED_PERSISTENCE_PROVIDER: "postgres",
  });

  assert.equal(status.mode, "managed-required");
  assert.equal(status.canRead, false);
  assert.equal(status.canMutate, false);
  assert.match(status.blockingReasons.join("\n"), /Managed persistence adapter is not implemented/);
});

test("buildPersistenceReadiness distinguishes configured from enforced managed persistence", () => {
  const readiness = buildPersistenceReadiness({
    LEXNET_RUNTIME_MODE: "production",
    LEXNET_MANAGED_DATABASE_URL: "postgres://user:password@example.com/db",
  });

  assert.equal(readiness.managedPersistenceConfigured, true);
  assert.equal(readiness.managedPersistenceEnforced, false);
  assert.match(readiness.blockingReasons.join("\n"), /Managed persistence adapter is not implemented/);
});
```

- [ ] **Step 2: Run tests and verify failure**

```bash
npm --prefix frontend run test:platform
```

Expected: FAIL because `persistence-adapter` does not exist and readiness lacks `managedPersistenceEnforced`.

- [ ] **Step 3: Implement persistence adapter status**

Create `frontend/src/lib/platform/persistence-adapter.ts`:

```ts
import { getLexNetRuntimeMode, type LexNetRuntimeMode, type PlatformReadinessEnv } from "./readiness";

export type PlatformStoreAdapterMode = "filesystem-local" | "managed-required";

export interface PlatformStoreAdapterStatus {
  mode: PlatformStoreAdapterMode;
  runtimeMode: LexNetRuntimeMode;
  canRead: boolean;
  canMutate: boolean;
  managedPersistenceConfigured: boolean;
  managedPersistenceEnforced: boolean;
  blockingReasons: string[];
}

export function getPlatformStoreAdapterStatus(env: PlatformReadinessEnv): PlatformStoreAdapterStatus {
  const runtimeMode = getLexNetRuntimeMode(env);
  const managedPersistenceConfigured = Boolean(
    env.LEXNET_MANAGED_DATABASE_URL || env.LEXNET_MANAGED_PERSISTENCE_PROVIDER,
  );

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

  return {
    mode: "managed-required",
    runtimeMode,
    canRead: false,
    canMutate: false,
    managedPersistenceConfigured,
    managedPersistenceEnforced: false,
    blockingReasons: [
      managedPersistenceConfigured
        ? "Managed persistence adapter is not implemented."
        : "Managed persistence is not configured.",
    ],
  };
}
```

- [ ] **Step 4: Update readiness persistence fields**

Modify `frontend/src/lib/platform/readiness.ts`:

- Import `getPlatformStoreAdapterStatus`.
- Add `managedPersistenceEnforced: boolean` to `PersistenceReadiness`.
- Use adapter status in `buildPersistenceReadiness()`.
- In production, `mode` remains `managed-configured` when env is configured, but blockers include adapter not implemented if enforcement is false.

- [ ] **Step 5: Run tests and verify pass**

```bash
npm --prefix frontend run test:platform
```

Expected: PASS.

- [ ] **Step 6: Commit persistence adapter status**

```bash
git add frontend/src/lib/platform/persistence-adapter.ts frontend/src/lib/platform/readiness.ts frontend/tests/platform.test.ts
git commit -m "feat: add persistence adapter status"
```

## Task 4: Evidence URL Policy Enforcement

**Files:**
- Create: `frontend/src/lib/platform/evidence-policy.ts`
- Modify: `frontend/src/lib/lexnet-domain.ts`
- Modify: `frontend/tests/platform.test.ts`
- Modify: `frontend/tests/lexnet-domain.test.ts`

- [ ] **Step 1: Add failing evidence policy tests**

Add import to `frontend/tests/platform.test.ts`:

```ts
import { evaluateEvidenceUrlPolicy } from "../src/lib/platform/evidence-policy";
```

Add tests:

```ts
test("evaluateEvidenceUrlPolicy accepts public HTTPS URLs", () => {
  const result = evaluateEvidenceUrlPolicy(["https://example.com/proof.pdf"], {
    LEXNET_RUNTIME_MODE: "production",
  });

  assert.deepEqual(result.acceptedUrls, ["https://example.com/proof.pdf"]);
  assert.deepEqual(result.rejectedUrls, []);
});

test("evaluateEvidenceUrlPolicy rejects private and internal hosts", () => {
  const result = evaluateEvidenceUrlPolicy([
    "https://localhost/proof",
    "https://192.168.1.10/proof",
    "https://169.254.169.254/latest/meta-data",
    "https://service.local/proof",
  ], { LEXNET_RUNTIME_MODE: "pilot" });

  assert.deepEqual(result.acceptedUrls, []);
  assert.equal(result.rejectedUrls.length, 4);
});

test("evaluateEvidenceUrlPolicy rejects non-HTTPS URLs in production", () => {
  const result = evaluateEvidenceUrlPolicy(["http://example.com/proof"], {
    LEXNET_RUNTIME_MODE: "production",
  });

  assert.deepEqual(result.acceptedUrls, []);
  assert.match(result.rejectedUrls[0]?.reason ?? "", /HTTPS/);
});
```

Add/update a domain test in `frontend/tests/lexnet-domain.test.ts`:

```ts
test("buildEvidencePack rejects private evidence URLs", () => {
  const pack = buildEvidencePack([
    "https://example.com/public-proof",
    "https://localhost/private-proof",
    "https://192.168.1.10/private-proof",
  ]);

  assert.deepEqual(pack.items.map((item) => item.url), ["https://example.com/public-proof"]);
});
```

- [ ] **Step 2: Run tests and verify failure**

```bash
npm --prefix frontend run test:platform
npm --prefix frontend run test:domain
```

Expected: FAIL because `evidence-policy` does not exist or private URLs still pass.

- [ ] **Step 3: Implement evidence policy helper**

Create `frontend/src/lib/platform/evidence-policy.ts`:

```ts
import { getLexNetRuntimeMode, type PlatformReadinessEnv } from "./readiness";

export interface EvidenceUrlPolicyResult {
  acceptedUrls: string[];
  rejectedUrls: Array<{ url: string; reason: string }>;
  blockingReasons: string[];
}

const IPV4_PRIVATE_RANGES = [
  /^10\./,
  /^127\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^0\./,
];

function isPrivateHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (normalized === "localhost" || normalized.endsWith(".local")) {
    return true;
  }

  if (IPV4_PRIVATE_RANGES.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  if (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80")
  ) {
    return true;
  }

  return false;
}

export function evaluateEvidenceUrlPolicy(
  urls: string[],
  env: PlatformReadinessEnv = {},
): EvidenceUrlPolicyResult {
  const mode = getLexNetRuntimeMode(env);
  const acceptedUrls: string[] = [];
  const rejectedUrls: Array<{ url: string; reason: string }> = [];
  const seen = new Set<string>();

  for (const rawUrl of urls) {
    const url = rawUrl.trim();
    if (!url || seen.has(url)) {
      continue;
    }
    seen.add(url);

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      rejectedUrls.push({ url, reason: "Evidence URL is invalid." });
      continue;
    }

    if (mode === "production" && parsed.protocol !== "https:") {
      rejectedUrls.push({ url, reason: "Production evidence URLs must use HTTPS." });
      continue;
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      rejectedUrls.push({ url, reason: "Evidence URL must use HTTP or HTTPS." });
      continue;
    }

    if (isPrivateHostname(parsed.hostname)) {
      rejectedUrls.push({ url, reason: "Evidence URL points to a private or internal host." });
      continue;
    }

    acceptedUrls.push(url);
  }

  return {
    acceptedUrls,
    rejectedUrls,
    blockingReasons: rejectedUrls.map((rejection) => `${rejection.url}: ${rejection.reason}`),
  };
}
```

- [ ] **Step 4: Use policy in domain normalization**

Modify `frontend/src/lib/lexnet-domain.ts`:

```ts
import { evaluateEvidenceUrlPolicy } from "./platform/evidence-policy";
```

Replace `normalizeEvidenceUrls()` body with:

```ts
export function normalizeEvidenceUrls(urls: string[]): string[] {
  return evaluateEvidenceUrlPolicy(urls).acceptedUrls;
}
```

- [ ] **Step 5: Run tests and verify pass**

```bash
npm --prefix frontend run test:platform
npm --prefix frontend run test:domain
```

Expected: PASS.

- [ ] **Step 6: Commit evidence policy**

```bash
git add frontend/src/lib/platform/evidence-policy.ts frontend/src/lib/lexnet-domain.ts frontend/tests/platform.test.ts frontend/tests/lexnet-domain.test.ts
git commit -m "feat: enforce evidence URL policy"
```

## Task 5: Readiness and Pilot Check Semantics

**Files:**
- Modify: `frontend/src/lib/platform/readiness.ts`
- Modify: `frontend/scripts/pilot-check.ts`
- Modify: `frontend/tests/platform.test.ts`

- [ ] **Step 1: Add failing readiness semantics tests**

Add/update tests:

```ts
test("buildAuthReadiness distinguishes configured from enforced production auth", () => {
  const providerOnly = buildAuthReadiness({
    LEXNET_RUNTIME_MODE: "production",
    LEXNET_PRODUCTION_AUTH_PROVIDER: "oauth-provider",
  });

  assert.equal(providerOnly.productionAuthConfigured, true);
  assert.equal(providerOnly.productionAuthEnforced, false);
  assert.equal(providerOnly.mutatingRoutesAllowed, false);

  const enforced = buildAuthReadiness({
    LEXNET_RUNTIME_MODE: "production",
    LEXNET_PRODUCTION_AUTH_MODE: "trusted-header",
    LEXNET_PRODUCTION_AUTH_SECRET: "secret",
  });

  assert.equal(enforced.productionAuthEnforced, true);
  assert.equal(enforced.mutatingRoutesAllowed, true);
});

test("buildPlatformReadinessStatus includes enforcement blockers in production", () => {
  const status = buildPlatformReadinessStatus({
    LEXNET_RUNTIME_MODE: "production",
    LEXNET_PRODUCTION_AUTH_PROVIDER: "oauth-provider",
    LEXNET_MANAGED_DATABASE_URL: "postgres://user:password@example.com/db",
  });

  assert.match(status.productionBlockers.join("\n"), /Production authentication enforcement is not configured/);
  assert.match(status.productionBlockers.join("\n"), /Managed persistence adapter is not implemented/);
  assert.equal(JSON.stringify(status).includes("password@example.com"), false);
});
```

- [ ] **Step 2: Run tests and verify failure**

```bash
npm --prefix frontend run test:platform
```

Expected: FAIL until readiness exposes enforcement fields.

- [ ] **Step 3: Update readiness fields**

Modify `frontend/src/lib/platform/readiness.ts`:

- Import `isProductionAuthConfigured` from `./production-auth`.
- Add `productionAuthEnforced: boolean` and `productionAuthMode?: "trusted-header"` to `AuthReadiness`.
- `productionAuthConfigured` remains `Boolean(LEXNET_PRODUCTION_AUTH_PROVIDER) || isProductionAuthConfigured(env)`.
- `productionAuthEnforced` is `isProductionAuthConfigured(env)`.
- `mutatingRoutesAllowed` in production depends on `productionAuthEnforced`, not provider name.
- Add production blocker `Production authentication enforcement is not configured.` when production mode lacks enforcement.
- Ensure `buildPersistenceReadiness()` uses adapter status from Task 3 and includes `managedPersistenceEnforced`.

- [ ] **Step 4: Update pilot-check output**

Modify `frontend/scripts/pilot-check.ts` auth/persistence output lines to include:

```ts
production auth enforced=${readiness.auth.productionAuthEnforced}
managed enforced=${readiness.persistence.managedPersistenceEnforced}
```

- [ ] **Step 5: Run tests and pilot check**

```bash
npm --prefix frontend run test:platform
npm --prefix frontend run pilot:check
```

Expected: PASS.

- [ ] **Step 6: Commit readiness semantics**

```bash
git add frontend/src/lib/platform/readiness.ts frontend/scripts/pilot-check.ts frontend/tests/platform.test.ts
git commit -m "fix: report enforced production controls"
```

## Task 6: Documentation Updates

**Files:**
- Modify: `README.md`
- Modify: `ARCHITECTURE.md`
- Modify: `docs/CURRENT_MAP.md`
- Modify: `docs/PILOT_RUNBOOK.md`

- [ ] **Step 1: Update docs for Phase E**

Update docs with concise notes:

- `README.md`: production boundary now requires enforced production auth, not just provider env; production still has no real managed DB adapter or payment movement.
- `ARCHITECTURE.md`: production auth trusted-header boundary, persistence adapter status, evidence policy enforcement.
- `docs/CURRENT_MAP.md`: list `frontend/src/lib/platform/production-auth.ts`, `frontend/src/lib/platform/persistence-adapter.ts`, and `frontend/src/lib/platform/evidence-policy.ts`; add env vars `LEXNET_PRODUCTION_AUTH_MODE`, `LEXNET_PRODUCTION_AUTH_SECRET`, `LEXNET_PRODUCTION_AUTH_CLOCK_SKEW_SECONDS`.
- `docs/PILOT_RUNBOOK.md`: add trusted-header HMAC explanation for future staging gateways and clarify Phase E is not deploy/payment.

- [ ] **Step 2: Commit docs**

```bash
git add README.md ARCHITECTURE.md docs/CURRENT_MAP.md docs/PILOT_RUNBOOK.md
git commit -m "docs: update production backbone guidance"
```

## Task 7: Final Verification

**Files:**
- No source edits expected unless verification finds a bug.

- [ ] **Step 1: Run platform tests**

```bash
npm --prefix frontend run test:platform
```

Expected: PASS.

- [ ] **Step 2: Run domain tests**

```bash
npm --prefix frontend run test:domain
```

Expected: PASS.

- [ ] **Step 3: Run TypeScript check**

```bash
npm --prefix frontend exec tsc -- --noEmit
```

Expected: PASS.

- [ ] **Step 4: Run build**

```bash
npm --prefix frontend run build
```

Expected: PASS.

- [ ] **Step 5: Run pilot check**

```bash
npm --prefix frontend run pilot:check
```

Expected: PASS in local-demo.

- [ ] **Step 6: Check git status**

```bash
git status --short
```

Expected: clean.

## Self-Review

- Spec coverage: production HMAC auth, mutation authorization, persistence adapter status, evidence policy enforcement, readiness configured-vs-enforced semantics, pilot check output, docs, and final verification are covered.
- Placeholder scan: no TBD/TODO/fill-in placeholders remain.
- Type consistency: `ProductionAuthEnv`, `ProductionAuthContext`, `authorizePlatformMutation`, `PlatformStoreAdapterStatus`, `EvidenceUrlPolicyResult`, and readiness enforcement fields are used consistently across tasks.
