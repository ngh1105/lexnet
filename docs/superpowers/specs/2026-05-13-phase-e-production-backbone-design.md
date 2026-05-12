# Phase E Production Backbone v1 Design

## Goal

Phase E turns the current production-readiness boundaries into enforceable production-backbone code without deploying infrastructure, choosing a managed database vendor, or adding payment/settlement movement. The result should make production mode stricter and more honest: mutating production requests require verified production authentication, filesystem persistence cannot masquerade as production storage, and evidence URLs are checked by a shared policy helper.

## Current Baseline

LexNet currently has:

- `LEXNET_RUNTIME_MODE=local-demo | pilot | production` readiness helpers.
- Demo-private API auth for local/pilot using `LEXNET_ENABLE_DEMO_PRIVATE_API`, `x-lexnet-operator-id`, and optional bearer token.
- Filesystem persistence at `.lexnet-data/store.json`.
- `/api/security/status`, `pilot:check`, and `pilot:prepare`.
- GenLayer submit and contract-state read-back proof routes.
- Public trust passport privacy boundaries.

The known gap is that production readiness is mostly reported, not fully enforced. In particular, a configured production auth provider string must not be treated as a verified production auth result.

## Non-Goals

- Do not deploy to Vercel or any external hosting in this phase.
- Do not provision a database or choose a managed DB vendor in this phase.
- Do not implement OAuth provider-specific login.
- Do not store private keys, seed phrases, wallet secrets, or raw evidence payloads.
- Do not add payment custody, payout, escrow fund movement, or settlement finality claims.
- Do not edit vendored `genlayer-js` source.

## Production Auth Boundary

Add a provider-neutral production auth boundary that can be backed by a future auth provider or gateway. Phase E should include a concrete, testable trusted-header/HMAC mode for server-side enforcement, not a fake OAuth provider.

### Environment

```bash
LEXNET_PRODUCTION_AUTH_MODE=trusted-header
LEXNET_PRODUCTION_AUTH_SECRET=
LEXNET_PRODUCTION_AUTH_CLOCK_SKEW_SECONDS=300
```

`LEXNET_PRODUCTION_AUTH_PROVIDER` remains a descriptive readiness setting, but it is not sufficient to authorize a production mutation.

### Request headers

Production mutating requests in `LEXNET_RUNTIME_MODE=production` must include:

```http
x-lexnet-production-operator-id: <operator id>
x-lexnet-production-auth-timestamp: <unix seconds>
x-lexnet-production-auth-signature: <hex hmac sha256>
```

The HMAC payload is deterministic:

```text
<METHOD>\n<pathname>\n<operator-id>\n<timestamp>
```

The signature is `HMAC-SHA256(payload, LEXNET_PRODUCTION_AUTH_SECRET)` encoded as lowercase hex.

### Rules

- Local demo and pilot mode keep using demo-private auth.
- Production mode rejects mutating routes unless production auth mode is configured and the HMAC verifies.
- Production mode must not authorize mutations solely because `LEXNET_PRODUCTION_AUTH_PROVIDER` is set.
- GET/HEAD demo-private reads can remain available where routes already allow them, but production mutations must use production auth.
- Authorization failure must not reveal secrets, signatures, or expected payloads.

## Persistence Adapter Boundary

Add a small persistence adapter abstraction around the existing platform store functions.

```ts
export type PlatformStoreAdapterMode = "filesystem-local" | "managed-required";

export interface PlatformStoreAdapterStatus {
  mode: PlatformStoreAdapterMode;
  runtimeMode: LexNetRuntimeMode;
  canRead: boolean;
  canMutate: boolean;
  blockingReasons: string[];
}
```

### Rules

- Local demo and pilot use the existing filesystem adapter.
- Production mode reports `managed-required` unless a future managed adapter is implemented.
- Production mutating operations must not silently fall back to filesystem persistence.
- Phase E does not need to implement a real Postgres/managed DB adapter. It should create the adapter seam and enforce honest blocking.
- Readiness status must distinguish:
  - managed persistence env is configured,
  - managed persistence is enforced by an adapter,
  - filesystem is still local/pilot only.

## Evidence Policy Enforcement

Create a shared evidence policy helper and use it where evidence URLs are normalized or accepted.

```ts
export interface EvidenceUrlPolicyResult {
  acceptedUrls: string[];
  rejectedUrls: Array<{ url: string; reason: string }>;
  blockingReasons: string[];
}
```

### Rules

- Evidence remains URL/metadata-based.
- Raw evidence bodies are never fetched or stored.
- Production accepts public `https://` URLs only.
- Private/internal hosts are rejected in all runtime modes by default.
- Local demo and pilot can keep accepting `http://localhost` only if explicitly needed for local tests, but private LAN, loopback IPs, link-local, and metadata hosts must be rejected.
- Existing deterministic evidence checksum behavior must remain stable for accepted URLs.

Private/internal host categories include:

- `localhost`, `*.local`, and loopback IPs.
- IPv4 private ranges: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`.
- Link-local and metadata hosts such as `169.254.169.254`.
- IPv6 loopback/private/link-local addresses.

## Readiness Status Semantics

Expand readiness so it no longer conflates configuration with enforcement.

Auth readiness should include:

```ts
productionAuthConfigured: boolean;
productionAuthEnforced: boolean;
productionAuthMode?: "trusted-header";
```

Persistence readiness should include:

```ts
managedPersistenceConfigured: boolean;
managedPersistenceEnforced: boolean;
filesystemPersistenceAllowed: boolean;
```

Production blockers must include:

- Production auth enforcement missing.
- Managed persistence adapter missing.
- Evidence retention policy missing.
- GenLayer state verification not explicitly configured.

The public status endpoint must remain public-safe: no secrets, connection strings, signatures, or full URLs that may contain credentials.

## Route Enforcement Strategy

Introduce a single authorization helper for platform API mutations:

```ts
export function authorizePlatformMutation(
  request: Request,
  env: PlatformAuthEnv,
  store: PlatformStore,
): PlatformMutationAuthorization;
```

Rules:

- In local demo/pilot, delegate to demo-private authorization.
- In production, verify production HMAC auth.
- Return the resolved operator from the store.
- Existing routes can migrate from `authorizeDemoPrivateApi()` to `authorizePlatformMutation()` where they mutate platform state.

Phase E should update mutating routes that currently rely on demo-private auth:

- `/api/passports`
- `/api/admin/backup`
- `/api/genlayer/verify-case`

If other routes are read-only, they can stay on demo-private auth unless they mutate later.

## Testing Strategy

Automated tests should cover:

1. Production mutation rejects when only `LEXNET_PRODUCTION_AUTH_PROVIDER` is set.
2. Production mutation accepts a valid trusted-header HMAC and resolves the operator.
3. Production mutation rejects stale timestamps.
4. Production mutation rejects invalid signatures without leaking secrets.
5. Local demo and pilot demo-private auth behavior remains unchanged.
6. Production persistence status reports managed adapter missing even if managed env is configured but no adapter is enforced.
7. Evidence policy accepts public HTTPS URLs.
8. Evidence policy rejects private/internal hosts.
9. Evidence policy rejects non-HTTPS URLs in production.
10. `/api/security/status` does not expose auth secrets, signatures, or database URLs.
11. `pilot:check` reports production auth/persistence enforcement blockers honestly.

Verification commands:

```bash
npm --prefix frontend run test:platform
npm --prefix frontend run test:domain
npm --prefix frontend exec tsc -- --noEmit
npm --prefix frontend run build
npm --prefix frontend run pilot:check
```

## Acceptance Criteria

Phase E is complete when:

- Production mutating route auth requires verified production auth context, not just provider configuration.
- Local/pilot demo-private flows continue to work.
- Persistence adapter status exists and production mode does not claim filesystem is production storage.
- Evidence policy helper exists and is tested against public/private URL cases.
- `/api/security/status` and `pilot:check` distinguish configured vs enforced production controls.
- No secrets or connection strings are exposed by readiness outputs.
- Full test, typecheck, build, and pilot check commands pass.

## Recommended Next Phase

Phase F should handle real staging deployment: Vercel project setup, environment management, smoke tests, deploy/rollback runbook, and staging URL verification. Phase F should still avoid production commerce claims until a real auth provider, managed database adapter, observability, backups, and security review are complete.
