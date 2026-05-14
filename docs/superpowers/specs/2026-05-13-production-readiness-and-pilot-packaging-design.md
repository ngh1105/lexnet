# Production Readiness and Pilot Packaging Design

## Goal

Phase C/D prepares LexNet for a safe pilot-to-production path after the GenLayer proof lifecycle is in place. Phase C adds production readiness boundaries for auth, persistence, evidence policy, and security status without locking the project to a specific external vendor. Phase D adds pilot packaging scripts, readiness checks, and operator runbook support that can run on the current codebase.

## Current Baseline

LexNet currently has:

- Demo-private API auth through `LEXNET_ENABLE_DEMO_PRIVATE_API`, `x-lexnet-operator-id`, and optional bearer token.
- Local filesystem persistence at `.lexnet-data/store.json`.
- Deterministic demo seed/reset/backup/restore/dev scripts.
- GenLayer submit and state-read proof routes behind the `genlayer-client` adapter.
- Public passport privacy boundary and platform store validation.

These are appropriate for local demos and pilots, but not enough for production commerce workflows.

## Non-Goals

- Do not choose or provision a managed database vendor in this phase.
- Do not implement OAuth provider-specific login flows in this phase.
- Do not store private keys, seed phrases, wallet secrets, or raw evidence payloads.
- Do not deploy to external infrastructure automatically.
- Do not add payment custody, payouts, or escrow fund movement.

## Phase C: Production Readiness Boundaries

### Production Mode

Add a small production readiness model that distinguishes these runtime modes:

```ts
export type LexNetRuntimeMode = "local-demo" | "pilot" | "production";
```

The mode is derived from env:

- `LEXNET_RUNTIME_MODE=local-demo` keeps current filesystem/demo-private behavior.
- `LEXNET_RUNTIME_MODE=pilot` allows filesystem persistence but must report production blockers clearly.
- `LEXNET_RUNTIME_MODE=production` requires production auth and managed persistence configuration before mutating routes can operate.

### Auth Boundary

Create a production auth boundary that does not pick a provider yet:

```ts
export interface AuthReadiness {
  mode: LexNetRuntimeMode;
  demoPrivateApiEnabled: boolean;
  demoPrivateApiTokenConfigured: boolean;
  productionAuthProvider?: string;
  productionAuthConfigured: boolean;
  mutatingRoutesAllowed: boolean;
  blockingReasons: string[];
}
```

Rules:

- Local demo mode may use demo-private auth.
- Pilot mode may use demo-private auth but must report that production auth is not configured.
- Production mode must reject demo-private-only mutating requests unless `LEXNET_PRODUCTION_AUTH_PROVIDER` is set.
- The existing demo-private helper remains available for local/pilot workflows.

### Persistence Boundary

Add a persistence readiness boundary that identifies storage capability:

```ts
export type PlatformPersistenceMode = "filesystem-local" | "managed-configured" | "managed-missing";
```

Rules:

- Filesystem persistence remains supported for local demo and pilot.
- Production mode requires managed persistence env to be present, represented by generic keys such as `LEXNET_MANAGED_DATABASE_URL` or `LEXNET_MANAGED_PERSISTENCE_PROVIDER`.
- No provider-specific SDK or schema migration is added in this phase.
- Security status must state whether the platform is using local filesystem persistence or a managed persistence configuration.

### Evidence Policy Boundary

Add a policy helper for evidence URLs:

```ts
export interface EvidencePolicyStatus {
  allowPublicHttpsOnly: boolean;
  rawEvidenceStorage: "disabled";
  retentionPolicyConfigured: boolean;
  blockedPrivateNetworkHosts: boolean;
  blockingReasons: string[];
}
```

Rules:

- Evidence remains URL/metadata-based.
- Raw evidence bodies are not stored in the platform store.
- Private/internal hosts remain blocked or reported as unsafe.
- Production mode requires `LEXNET_EVIDENCE_RETENTION_POLICY` to be configured.

### Security Status Expansion

Extend `/api/security/status` and shared status helpers to include:

- runtime mode
- auth readiness
- persistence readiness
- evidence policy readiness
- GenLayer state verification capability
- current production blockers

The endpoint should keep returning public-safe configuration status only. It must not expose secrets or full connection strings.

## Phase D: Pilot Packaging

### Pilot Check Script

Add:

```text
npm run pilot:check
```

The script should:

1. Load the same readiness helpers used by `/api/security/status`.
2. Print runtime mode, auth status, persistence status, evidence policy status, and GenLayer readiness.
3. Confirm `.lexnet-data` is ignored by git when present.
4. Scan the local platform store, if it exists, for forbidden secret-like keys: `privateKey`, `seedPhrase`, `mnemonic`, `walletSecret`.
5. Exit non-zero only for production-mode blockers. Pilot/local warnings should be printed but not fail the command.

### Pilot Prepare Script

Add:

```text
npm run pilot:prepare
```

The script should:

1. Reset local demo store.
2. Seed deterministic pilot data.
3. Print seeded case count, queue count, passport count, public passport slugs, and GenLayer readiness status.
4. Refuse to run in `LEXNET_RUNTIME_MODE=production`.

### Pilot Summary

Add a reusable summary helper for scripts and possible admin UI use:

```ts
export interface PilotSummary {
  runtimeMode: LexNetRuntimeMode;
  caseCount: number;
  queueCount: number;
  publishedPassportCount: number;
  genLayerExecutionCounts: Record<string, number>;
  blockingReasons: string[];
}
```

The summary must use existing platform store data and readiness helpers. It must not require network calls.

### Runbook Documentation

Add `docs/PILOT_RUNBOOK.md` with:

- local pilot setup
- env checklist
- seed/reset/backup/restore workflow
- GenLayer proof workflow
- readiness check commands
- known production blockers
- forbidden claims and data-handling boundaries

## Testing Strategy

Automated tests should cover:

1. Runtime mode defaults to local demo.
2. Production mode blocks mutating route readiness when production auth is missing.
3. Production mode reports managed persistence missing when no managed persistence env exists.
4. Pilot mode allows filesystem persistence but reports it as local/demo infrastructure.
5. Evidence policy reports missing retention policy in production.
6. Pilot prepare refuses production mode.
7. Pilot check detects forbidden secret-like keys in store JSON.
8. Pilot summary counts GenLayer execution statuses.
9. Security status does not expose raw secret values or connection strings.

Verification commands:

```bash
npm run test:platform
npm run test:domain
npm exec tsc -- --noEmit
npm run build
npm run pilot:check
```

## Acceptance Criteria

Phase C/D is complete when:

- Runtime mode, auth readiness, persistence readiness, evidence policy, and pilot summary helpers exist and are tested.
- `/api/security/status` reports production blockers without exposing secrets.
- `pilot:check` and `pilot:prepare` scripts exist and are documented.
- `pilot:prepare` refuses production mode.
- Local demo and pilot flows continue to work with `.lexnet-data/store.json`.
- Full test, typecheck, build, and pilot check commands pass in local-demo mode.
