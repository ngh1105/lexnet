# GenLayer Execution Verification Design

## Goal

Phase B turns the current guarded `genlayer-js` submit boundary into a verifiable GenLayer testnet lifecycle for `verify_case`. LexNet may show that a GenLayer call was submitted, confirmed, failed, or verified from contract state, but it must not claim on-chain verification until `get_case(case_id)` returns contract state containing a verification report.

## Current Baseline

LexNet already has the correct first boundary:

- `frontend/src/lib/genlayer-client.ts` wraps `genlayer-js` behind a narrow adapter.
- `frontend/src/app/api/genlayer/verify-case/route.ts` submits `verify_case` only after demo-private auth, case lookup, and readiness checks pass.
- `frontend/src/lib/lexnet-contract.ts` builds readiness and execution plans.
- `contracts/lexnet_commerce_core.py` exposes `verify_case(case_id)`, `get_case(case_id)`, and `list_case_ids()`.

The missing part is proof after submission. A transaction hash or SDK return value is not enough to mark a case verified. The app must read contract state and confirm that the case has a `verification_report`.

## Non-Goals

- Do not implement payment custody, payouts, settlement transfer, or fund-release claims.
- Do not store private keys, seed phrases, or wallet secrets in `.lexnet-data/store.json`.
- Do not edit the vendored `genlayer-js/` package.
- Do not replace production auth or managed database storage in this phase.
- Do not require live network access for automated unit tests; use injected SDK clients there.

## Architecture

Keep `.lexnet-data/store.json` as the local pilot/demo source of truth, and add a GenLayer execution ledger inside the platform store. The execution ledger records attempts and proofs separately from local verification reports so local recommendations and contract-state evidence stay distinguishable.

`frontend/src/lib/genlayer-client.ts` remains the only app boundary that knows the SDK method shapes. Route handlers call this adapter, not `genlayer-js` directly. UI components render statuses from API DTOs and must distinguish local recommendation, submitted execution, and state-verified contract proof.

## Data Model

Add a platform store collection named `genLayerExecutions`:

```ts
export type GenLayerExecutionStatus =
  | "submitted"
  | "confirmed"
  | "failed"
  | "state_verified";

export interface GenLayerExecutionRecord {
  id: string;
  caseId: string;
  method: "verify_case";
  status: GenLayerExecutionStatus;
  transactionHash?: string;
  contractAddress: string;
  rpcUrl: string;
  networkLabel: string;
  submittedAt: string;
  checkedAt?: string;
  blockingReasons: string[];
  sanitizedError?: string;
  proof?: {
    contractCaseStatus?: string;
    verificationReport?: unknown;
  };
}
```

Rules:

- `submitted` is written after SDK submit returns without throwing.
- `failed` is written when SDK submit or state read throws; errors must be sanitized strings.
- `state_verified` is written only when contract `get_case(case_id)` returns valid JSON and `verification_report` is present.
- Local case status must not be mutated to GenLayer-verified unless the state proof exists.

## Adapter Design

Extend `frontend/src/lib/genlayer-client.ts` with read-back support:

```ts
export interface GenLayerClientAdapter {
  verifyCase(input: GenLayerVerifyCaseInput): Promise<GenLayerExecutionResult>;
  readCase(input: GenLayerReadCaseInput): Promise<GenLayerCaseReadResult>;
}
```

The adapter should support the installed SDK shape through injected clients. If the SDK exposes `readContract`, use that for `get_case`. If the SDK uses a different read method, hide that inside the adapter and keep application code unchanged.

The normalized read result should expose:

```ts
export interface GenLayerCaseReadResult {
  caseId: string;
  raw: unknown;
  parsedCase: unknown | null;
}
```

Parsing is conservative:

- string JSON is parsed.
- empty string means case not found or not synced yet.
- invalid JSON is a failed state-check result.
- no `verification_report` means no `state_verified` status.

## API Routes

### Submit route

Keep:

```text
POST /api/genlayer/verify-case
```

Behavior:

1. Authorize with demo-private auth.
2. Read body `{ caseId, walletConnected }`.
3. Look up the local platform case.
4. Build readiness and execution plan.
5. If blocked, return `409` with blocking reasons.
6. Submit `verify_case` through the adapter.
7. Append `GenLayerExecutionRecord` with `status: "submitted"` and any transaction hash/status returned by the SDK.
8. Return a DTO that says proof is pending, not verified.

### State route

Add:

```text
GET /api/genlayer/cases/[caseId]
```

Behavior:

1. Authorize with demo-private auth.
2. Build readiness from env and request query/header wallet signal if needed.
3. If blocked, return `409` with blocking reasons.
4. Read contract state with `get_case(caseId)` through the adapter.
5. If the contract returns valid case JSON with `verification_report`, update the latest execution for that case to `state_verified` and store the proof.
6. If the contract returns no report, return the current execution state without claiming verification.
7. If read fails or JSON is invalid, record a failed check without overwriting previous successful proof.

## UI Design

Add a small GenLayer execution panel to the case detail screen. It should show one of these states:

- `Local recommendation only` — no configured contract or no submitted execution.
- `GenLayer ready` — readiness passes and a submit action is available.
- `Submitted to GenLayer` — SDK submit returned and proof is pending.
- `Waiting for contract state verification` — read-back has not yet found a report.
- `Verified from contract state` — `get_case` returned a `verification_report`.
- `Execution failed` — SDK submit/read failed, with sanitized error text.

Forbidden labels in this phase:

- `settled`
- `paid`
- `funds released`
- `escrow completed`
- `final on-chain settlement`

## Testing Strategy

Automated tests must not require live GenLayer network access. Use injected SDK clients and temporary platform stores.

Required tests:

1. Adapter submit maps `verify_case` to SDK write request.
2. Adapter read maps `get_case` to SDK read request.
3. Contract state parser returns `state_verified` only when `verification_report` exists.
4. Empty contract case read does not mark verified.
5. Invalid contract JSON records a failed state check and preserves any previous proof.
6. Submit route appends a `submitted` execution record.
7. State route updates the latest execution to `state_verified` only with proof.
8. Readiness and auth failures return blocking responses without SDK calls.
9. Execution records never include private key, seed phrase, mnemonic, or wallet secret fields.
10. UI state mapper never emits forbidden settlement/payment labels.

Verification commands:

```bash
npm run test:platform
npm run test:domain
npm exec tsc -- --noEmit
npm run build
```

## Manual Testnet Checklist

This checklist is allowed to depend on real GenLayer infrastructure and should be run only when testnet env is configured.

1. Set `NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS` to a deployed `LexNetCommerceCore` address.
2. Set `NEXT_PUBLIC_GENLAYER_RPC_URL` to the target GenLayer RPC endpoint.
3. Enable demo-private auth headers and token if configured.
4. Use a case that exists on the contract and has submitted evidence.
5. Call `POST /api/genlayer/verify-case`.
6. Confirm response says submitted/proof pending.
7. Call `GET /api/genlayer/cases/[caseId]` until contract `get_case` returns a report.
8. Confirm UI changes to `Verified from contract state` only after the report appears.
9. Confirm no payment, escrow, or settlement-finality language appears.

## Implementation Sequence

1. Extend platform store types and default store with `genLayerExecutions`.
2. Add store helpers to append and update GenLayer execution records.
3. Extend `genlayer-client.ts` with `readCase` support and conservative parsing helpers.
4. Add tests for submit/read normalization and proof gating.
5. Update `POST /api/genlayer/verify-case` to persist submitted/failed execution records.
6. Add `GET /api/genlayer/cases/[caseId]` for state read-back and proof updates.
7. Add UI state mapper and case-detail panel.
8. Update README, ARCHITECTURE, and CURRENT_MAP with the Phase B boundary.
9. Run full verification commands and manual checklist if real testnet env exists.

## Acceptance Criteria

Phase B is complete when:

- A GenLayer submit result is persisted as an execution record.
- Contract state read-back exists behind the adapter and API route.
- The UI can show proof-pending vs state-verified separately.
- `state_verified` cannot occur without a parsed contract `verification_report`.
- Automated tests cover success, pending, failed, invalid JSON, auth, readiness, and secret-safety cases.
- Typecheck and production build pass.
- Documentation states that a transaction hash alone is not final verification.
