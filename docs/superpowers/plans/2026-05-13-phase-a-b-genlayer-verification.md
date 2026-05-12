# Phase A-B GenLayer Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize the completed hardening work, then add GenLayer execution read-back so LexNet only claims contract verification after `get_case(case_id)` returns a verification report.

**Architecture:** Phase A commits the already-verified demo hardening and guarded SDK boundary. Phase B keeps `frontend/src/lib/genlayer-client.ts` as the only `genlayer-js` boundary, persists GenLayer execution records in the platform store, adds a read-back API route, and renders proof-pending vs state-verified UI separately.

**Tech Stack:** Next.js App Router, TypeScript, Node test runner via `tsx --test`, local `.lexnet-data/store.json`, `genlayer-js` through adapter only.

---

## File Structure

- Modify: `frontend/src/lib/platform/types.ts` — add `GenLayerExecutionRecord` and status types.
- Modify: `frontend/src/lib/platform/store.ts` — initialize `genLayerExecutions`, validate it, append/update execution records.
- Modify: `frontend/src/lib/genlayer-client.ts` — add `readCase`, `buildGenLayerGetCaseRequest`, conservative contract case parsing, and proof classification helpers.
- Modify: `frontend/src/app/api/genlayer/verify-case/route.ts` — persist submitted/failed records instead of only returning SDK output.
- Create: `frontend/src/app/api/genlayer/cases/[caseId]/route.ts` — read contract state and update proof status.
- Create: `frontend/src/lib/genlayer-execution.ts` — UI/API-safe execution status labels and forbidden-claim-safe state mapping.
- Modify: `frontend/src/components/CaseDetailClient.tsx` — show GenLayer execution status panel and state-check action without settlement/finality claims.
- Modify: `frontend/tests/platform.test.ts` — add store, adapter, route, proof, and forbidden-label tests.
- Modify: `README.md`, `ARCHITECTURE.md`, `docs/CURRENT_MAP.md` — document state-verified boundary.

## Phase A: Stabilize Current Hardening Work

### Task 1: Verify current baseline and commit hardening boundary

**Files:**
- Existing changes across docs, scripts, API routes, platform helpers, and tests.

- [ ] **Step 1: Run baseline verification**

Run from `frontend/`:

```powershell
npm run test:platform
npm run test:domain
npm exec tsc -- --noEmit
npm run build
```

Expected:

```text
platform tests: 51 passed, 0 failed
domain tests: 75 passed, 0 failed
tsc: exit 0
build: Compiled successfully
```

- [ ] **Step 2: Verify demo data stays ignored**

Run from `frontend/`:

```powershell
git status --short --ignored "..\.lexnet-data"
```

Expected:

```text
!! ../.lexnet-data/
```

- [ ] **Step 3: Commit current hardening work**

Run from `frontend/` and stage only project files, not `.lexnet-data`:

```powershell
git add ..\ARCHITECTURE.md ..\README.md ..\docs\CURRENT_MAP.md ..\docs\superpowers\plans\2026-05-12-production-hardening-and-demo-polish.md package.json scripts\demo-backup.ts scripts\demo-dev.ts scripts\demo-restore.ts scripts\dev-port.ts src\app\api\genlayer src\app\api\security\status\route.ts src\lib\genlayer-client.ts src\lib\lexnet-contract.ts src\lib\lexnet-service.ts src\lib\platform\api.ts src\lib\platform\auth.ts src\lib\platform\backup.ts src\lib\platform\store.ts tests\platform.test.ts

git commit -m @'
feat: harden demo backend and add guarded GenLayer boundary

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
'@
```

Expected: commit succeeds and hooks, if any, pass.

- [ ] **Step 4: Confirm clean baseline after commit**

Run:

```powershell
git status --short
```

Expected: only the new Phase B spec/plan files may remain uncommitted if they were intentionally created after the hardening commit.

## Phase B: GenLayer Execution Verification

### Task 2: Add GenLayer execution records to platform store

**Files:**
- Modify: `frontend/src/lib/platform/types.ts`
- Modify: `frontend/src/lib/platform/store.ts`
- Test: `frontend/tests/platform.test.ts`

- [ ] **Step 1: Add failing platform store tests**

Append tests to `frontend/tests/platform.test.ts`:

```ts
test("platform store initializes GenLayer execution records", async () => {
  const storePath = join(await mkdtemp(join(tmpdir(), "lexnet-genlayer-store-")), "store.json");
  const store = await readPlatformStore(storePath);

  assert.deepEqual(store.genLayerExecutions, []);
});

test("appendGenLayerExecution records submitted execution metadata", async () => {
  const storePath = join(await mkdtemp(join(tmpdir(), "lexnet-genlayer-append-")), "store.json");
  const execution = await appendGenLayerExecution(
    {
      id: "glex-lx-1-verify-case-2026-05-13T00:00:00.000Z",
      caseId: "lx-1",
      method: "verify_case",
      status: "submitted",
      transactionHash: "0xabc",
      contractAddress: "0x1111111111111111111111111111111111111111",
      rpcUrl: "https://studio.genlayer.com/api",
      networkLabel: "Studionet",
      submittedAt: "2026-05-13T00:00:00.000Z",
      blockingReasons: [],
    },
    storePath,
  );
  const store = await readPlatformStore(storePath);

  assert.equal(execution.status, "submitted");
  assert.equal(store.genLayerExecutions.length, 1);
  assert.equal(store.genLayerExecutions[0]?.caseId, "lx-1");
});

test("updateLatestGenLayerExecutionProof marks latest case execution as state verified", async () => {
  const storePath = join(await mkdtemp(join(tmpdir(), "lexnet-genlayer-proof-")), "store.json");
  await appendGenLayerExecution(
    {
      id: "older",
      caseId: "lx-1",
      method: "verify_case",
      status: "submitted",
      contractAddress: "0x1111111111111111111111111111111111111111",
      rpcUrl: "https://studio.genlayer.com/api",
      networkLabel: "Studionet",
      submittedAt: "2026-05-13T00:00:00.000Z",
      blockingReasons: [],
    },
    storePath,
  );
  const updated = await updateLatestGenLayerExecutionProof(
    "lx-1",
    {
      status: "state_verified",
      checkedAt: "2026-05-13T00:05:00.000Z",
      proof: {
        contractCaseStatus: "VERIFIED",
        verificationReport: { verdict: "APPROVE", score: 91 },
      },
    },
    storePath,
  );

  assert.equal(updated?.status, "state_verified");
  assert.equal(updated?.proof?.contractCaseStatus, "VERIFIED");
});
```

Also update the imports at the top of `frontend/tests/platform.test.ts` to include `tmpdir` and the new store helpers:

```ts
import { tmpdir } from "node:os";
import {
  appendGenLayerExecution,
  updateLatestGenLayerExecutionProof,
} from "../src/lib/platform/store";
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm run test:platform
```

Expected: fails because `genLayerExecutions`, `appendGenLayerExecution`, or `updateLatestGenLayerExecutionProof` do not exist.

- [ ] **Step 3: Add platform types**

In `frontend/src/lib/platform/types.ts`, add:

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

Add `genLayerExecutions: GenLayerExecutionRecord[];` to `PlatformStore`.

- [ ] **Step 4: Add store initialization and mutation helpers**

In `frontend/src/lib/platform/store.ts`, update the default store creation to include:

```ts
genLayerExecutions: [],
```

Update store validation to require an array:

```ts
if (!Array.isArray(candidate.genLayerExecutions)) {
  throw new Error("Platform store genLayerExecutions must be an array.");
}
```

Add helpers:

```ts
export async function appendGenLayerExecution(
  execution: GenLayerExecutionRecord,
  storePath = DEFAULT_PLATFORM_STORE_PATH,
): Promise<GenLayerExecutionRecord> {
  await mutatePlatformStore((store) => {
    store.genLayerExecutions.push(execution);
    return store;
  }, storePath);
  return execution;
}

export async function updateLatestGenLayerExecutionProof(
  caseId: string,
  update: Pick<GenLayerExecutionRecord, "status" | "checkedAt" | "proof" | "sanitizedError">,
  storePath = DEFAULT_PLATFORM_STORE_PATH,
): Promise<GenLayerExecutionRecord | null> {
  let updated: GenLayerExecutionRecord | null = null;
  await mutatePlatformStore((store) => {
    for (let index = store.genLayerExecutions.length - 1; index >= 0; index -= 1) {
      const execution = store.genLayerExecutions[index];
      if (execution.caseId === caseId && execution.method === "verify_case") {
        store.genLayerExecutions[index] = { ...execution, ...update };
        updated = store.genLayerExecutions[index];
        break;
      }
    }
    return store;
  }, storePath);
  return updated;
}
```

Ensure `GenLayerExecutionRecord` is imported from `./types`.

- [ ] **Step 5: Run platform tests**

Run:

```powershell
npm run test:platform
```

Expected: all platform tests pass with the new tests included.

### Task 3: Add GenLayer read-back adapter and proof classification

**Files:**
- Modify: `frontend/src/lib/genlayer-client.ts`
- Test: `frontend/tests/platform.test.ts`

- [ ] **Step 1: Add failing adapter tests**

Append tests to `frontend/tests/platform.test.ts`:

```ts
test("buildGenLayerGetCaseRequest maps LexNet get_case payload for genlayer-js", () => {
  const request = buildGenLayerGetCaseRequest({
    contractAddress: "0x1111111111111111111111111111111111111111",
    caseId: "lx-1",
  });

  assert.deepEqual(request, {
    contractAddress: "0x1111111111111111111111111111111111111111",
    method: "get_case",
    args: ["lx-1"],
  });
});

test("createGenLayerClientAdapter reads contract case state through injected genlayer-js client", async () => {
  const sdk: GenLayerSdkModule = {
    createClient: () => ({
      readContract: async (request) => {
        assert.equal(request.functionName, "get_case");
        assert.deepEqual(request.args, ["lx-1"]);
        return JSON.stringify({
          id: "lx-1",
          status: "VERIFIED",
          verification_report: { verdict: "APPROVE", score: 95 },
        });
      },
    }),
  };

  const adapter = createGenLayerClientAdapter({ sdk, rpcUrl: "https://studio.genlayer.com/api" });
  const result = await adapter.readCase({
    contractAddress: "0x1111111111111111111111111111111111111111",
    caseId: "lx-1",
  });

  assert.equal(result.caseId, "lx-1");
  assert.equal(result.parsedCase?.status, "VERIFIED");
});

test("classifyGenLayerCaseProof requires a verification report before state_verified", () => {
  assert.equal(
    classifyGenLayerCaseProof({ id: "lx-1", status: "VERIFIED" }).status,
    "confirmed",
  );
  assert.equal(
    classifyGenLayerCaseProof({
      id: "lx-1",
      status: "VERIFIED",
      verification_report: { verdict: "APPROVE" },
    }).status,
    "state_verified",
  );
});
```

Update imports:

```ts
import {
  buildGenLayerGetCaseRequest,
  classifyGenLayerCaseProof,
} from "../src/lib/genlayer-client";
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm run test:platform
```

Expected: fails because read-back adapter APIs do not exist.

- [ ] **Step 3: Extend genlayer-client types**

In `frontend/src/lib/genlayer-client.ts`, add `get_case` support:

```ts
export interface GenLayerReadCaseInput {
  contractAddress: string;
  caseId: string;
}

export interface GenLayerGetCaseRequest {
  contractAddress: string;
  method: "get_case";
  args: string[];
}

interface GenLayerReadContractRequest {
  address: `0x${string}`;
  functionName: "get_case";
  args: string[];
}

export interface GenLayerCaseReadResult {
  caseId: string;
  raw: unknown;
  parsedCase: Record<string, unknown> | null;
}
```

Extend `GenLayerSdkClient`:

```ts
readContract?: (request: GenLayerReadContractRequest) => Promise<unknown>;
```

Extend `GenLayerClientAdapter`:

```ts
readCase(input: GenLayerReadCaseInput): Promise<GenLayerCaseReadResult>;
```

- [ ] **Step 4: Implement read request and proof helpers**

Add:

```ts
export function buildGenLayerGetCaseRequest({
  contractAddress,
  caseId,
}: GenLayerReadCaseInput): GenLayerGetCaseRequest {
  return {
    contractAddress,
    method: "get_case",
    args: [caseId],
  };
}

export function parseGenLayerCase(raw: unknown): Record<string, unknown> | null {
  if (raw === "") {
    return null;
  }
  if (typeof raw === "string") {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  }
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : null;
}

export function classifyGenLayerCaseProof(parsedCase: Record<string, unknown> | null): {
  status: "confirmed" | "state_verified";
  contractCaseStatus?: string;
  verificationReport?: unknown;
} {
  const verificationReport = parsedCase?.verification_report;
  return {
    status: verificationReport ? "state_verified" : "confirmed",
    contractCaseStatus:
      typeof parsedCase?.status === "string" ? parsedCase.status : undefined,
    verificationReport,
  };
}
```

Add `readCase` inside the adapter return value:

```ts
async readCase(input) {
  if (!client.readContract) {
    throw new Error("genlayer-js contract read method is unavailable.");
  }
  const request = buildGenLayerGetCaseRequest(input);
  const raw = await client.readContract({
    address: request.contractAddress as `0x${string}`,
    functionName: request.method,
    args: request.args,
  });
  return {
    caseId: input.caseId,
    raw,
    parsedCase: parseGenLayerCase(raw),
  };
}
```

- [ ] **Step 5: Run platform tests**

Run:

```powershell
npm run test:platform
```

Expected: all platform tests pass.

### Task 4: Persist submit execution records in verify-case route

**Files:**
- Modify: `frontend/src/app/api/genlayer/verify-case/route.ts`
- Test: `frontend/tests/platform.test.ts`

- [ ] **Step 1: Add route-level helper tests if direct route testing is cumbersome**

Add exported helper in route or a new internal function is not necessary if route tests already exist. If route construction is cumbersome, test the execution record builder in `frontend/src/lib/genlayer-execution.ts` in Task 6. For this task, verify through store helper and adapter tests plus manual route behavior.

- [ ] **Step 2: Update route imports**

In `frontend/src/app/api/genlayer/verify-case/route.ts`, import:

```ts
import { appendGenLayerExecution } from "@/lib/platform/store";
```

- [ ] **Step 3: Persist submitted and failed executions**

Replace the direct adapter call/return block with:

```ts
try {
  const sdk = await loadGenLayerSdk();
  const adapter = createGenLayerClientAdapter({ sdk, rpcUrl: readiness.rpcUrl });
  const result = await adapter.verifyCase({
    contractAddress: plan.request.contractAddress,
    caseId: commerceCase.id,
  });
  const submittedAt = new Date().toISOString();
  const execution = await appendGenLayerExecution({
    id: `glex-${commerceCase.id}-verify-case-${submittedAt}`,
    caseId: commerceCase.id,
    method: "verify_case",
    status: "submitted",
    transactionHash: result.transactionHash,
    contractAddress: plan.request.contractAddress,
    rpcUrl: readiness.rpcUrl,
    networkLabel: readiness.networkLabel,
    submittedAt,
    blockingReasons: [],
  });

  return jsonOk({ status: "submitted", proofPending: true, execution, result });
} catch (error) {
  const submittedAt = new Date().toISOString();
  const execution = await appendGenLayerExecution({
    id: `glex-${commerceCase.id}-verify-case-${submittedAt}`,
    caseId: commerceCase.id,
    method: "verify_case",
    status: "failed",
    contractAddress: plan.request.contractAddress,
    rpcUrl: readiness.rpcUrl,
    networkLabel: readiness.networkLabel,
    submittedAt,
    blockingReasons: [],
    sanitizedError: error instanceof Error ? error.message : "GenLayer execution failed.",
  });

  return NextResponse.json(
    { error: "GenLayer execution failed.", execution },
    { status: 502 },
  );
}
```

- [ ] **Step 4: Run typecheck**

Run:

```powershell
npm exec tsc -- --noEmit
```

Expected: exit 0.

### Task 5: Add contract state read-back route

**Files:**
- Create: `frontend/src/app/api/genlayer/cases/[caseId]/route.ts`
- Test: `frontend/tests/platform.test.ts`

- [ ] **Step 1: Add the route file**

Create `frontend/src/app/api/genlayer/cases/[caseId]/route.ts`:

```ts
import { NextResponse } from "next/server";

import {
  classifyGenLayerCaseProof,
  createGenLayerClientAdapter,
  loadGenLayerSdk,
} from "@/lib/genlayer-client";
import { getLexNetContractReadiness } from "@/lib/lexnet-contract";
import { jsonOk } from "@/lib/platform/api";
import { authorizeDemoPrivateApi } from "@/lib/platform/auth";
import {
  readPlatformStore,
  updateLatestGenLayerExecutionProof,
} from "@/lib/platform/store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const store = await readPlatformStore();
  const authorization = authorizeDemoPrivateApi(request, process.env, store);
  if (!authorization.authorized) {
    return authorization.response;
  }

  const { caseId } = await params;
  const readiness = getLexNetContractReadiness({
    env: process.env,
    walletConnected: request.headers.get("x-lexnet-wallet-connected") === "true",
  });

  if (!readiness.isReady) {
    return NextResponse.json(
      {
        error: "GenLayer state read is not ready.",
        blockingReasons: readiness.blockingReasons,
      },
      { status: 409 },
    );
  }

  const checkedAt = new Date().toISOString();

  try {
    const sdk = await loadGenLayerSdk();
    const adapter = createGenLayerClientAdapter({ sdk, rpcUrl: readiness.rpcUrl });
    const result = await adapter.readCase({
      contractAddress: readiness.contractAddress ?? "",
      caseId,
    });
    const proof = classifyGenLayerCaseProof(result.parsedCase);
    const execution = await updateLatestGenLayerExecutionProof(caseId, {
      status: proof.status,
      checkedAt,
      proof: {
        contractCaseStatus: proof.contractCaseStatus,
        verificationReport: proof.verificationReport,
      },
    });

    return jsonOk({
      caseId,
      status: proof.status,
      stateVerified: proof.status === "state_verified",
      execution,
      result,
    });
  } catch (error) {
    const execution = await updateLatestGenLayerExecutionProof(caseId, {
      status: "failed",
      checkedAt,
      sanitizedError: error instanceof Error ? error.message : "GenLayer state read failed.",
    });

    return NextResponse.json(
      {
        error: "GenLayer state read failed.",
        execution,
      },
      { status: 502 },
    );
  }
}
```

- [ ] **Step 2: Run typecheck**

Run:

```powershell
npm exec tsc -- --noEmit
```

Expected: exit 0.

### Task 6: Add forbidden-claim-safe UI state mapper

**Files:**
- Create: `frontend/src/lib/genlayer-execution.ts`
- Test: `frontend/tests/platform.test.ts`

- [ ] **Step 1: Add failing UI state mapper test**

Append to `frontend/tests/platform.test.ts`:

```ts
test("buildGenLayerExecutionViewModel avoids settlement and payment finality labels", () => {
  const models = [
    buildGenLayerExecutionViewModel(null, true),
    buildGenLayerExecutionViewModel({ status: "submitted" } as GenLayerExecutionRecord, true),
    buildGenLayerExecutionViewModel({ status: "confirmed" } as GenLayerExecutionRecord, true),
    buildGenLayerExecutionViewModel({ status: "state_verified" } as GenLayerExecutionRecord, true),
    buildGenLayerExecutionViewModel({ status: "failed", sanitizedError: "boom" } as GenLayerExecutionRecord, true),
  ];
  const forbidden = /settled|paid|funds released|escrow completed|final on-chain settlement/i;

  for (const model of models) {
    assert.equal(forbidden.test(`${model.label} ${model.description}`), false);
  }
});
```

Update imports:

```ts
import type { GenLayerExecutionRecord } from "../src/lib/platform/types";
import { buildGenLayerExecutionViewModel } from "../src/lib/genlayer-execution";
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm run test:platform
```

Expected: fails because `genlayer-execution.ts` does not exist.

- [ ] **Step 3: Create UI state mapper**

Create `frontend/src/lib/genlayer-execution.ts`:

```ts
import type { GenLayerExecutionRecord } from "./platform/types";

export interface GenLayerExecutionViewModel {
  label: string;
  description: string;
  tone: "neutral" | "ready" | "pending" | "success" | "danger";
  canSubmit: boolean;
  canCheckState: boolean;
}

export function buildGenLayerExecutionViewModel(
  execution: Pick<GenLayerExecutionRecord, "status" | "sanitizedError"> | null,
  isReady: boolean,
): GenLayerExecutionViewModel {
  if (!isReady) {
    return {
      label: "Local recommendation only",
      description: "GenLayer execution is blocked until contract, RPC, and wallet readiness pass.",
      tone: "neutral",
      canSubmit: false,
      canCheckState: false,
    };
  }

  if (!execution) {
    return {
      label: "GenLayer ready",
      description: "This case can be submitted for GenLayer verification.",
      tone: "ready",
      canSubmit: true,
      canCheckState: false,
    };
  }

  if (execution.status === "submitted") {
    return {
      label: "Submitted to GenLayer",
      description: "Submission returned from the SDK. Contract state proof is still pending.",
      tone: "pending",
      canSubmit: false,
      canCheckState: true,
    };
  }

  if (execution.status === "confirmed") {
    return {
      label: "Waiting for contract state verification",
      description: "Contract state was readable, but no verification report was found yet.",
      tone: "pending",
      canSubmit: false,
      canCheckState: true,
    };
  }

  if (execution.status === "state_verified") {
    return {
      label: "Verified from contract state",
      description: "Contract state contains a verification report for this case.",
      tone: "success",
      canSubmit: false,
      canCheckState: true,
    };
  }

  return {
    label: "Execution failed",
    description: execution.sanitizedError ?? "The GenLayer execution attempt failed.",
    tone: "danger",
    canSubmit: true,
    canCheckState: true,
  };
}
```

- [ ] **Step 4: Run platform tests**

Run:

```powershell
npm run test:platform
```

Expected: all platform tests pass.

### Task 7: Add case-detail GenLayer proof panel

**Files:**
- Modify: `frontend/src/components/CaseDetailClient.tsx`

- [ ] **Step 1: Locate existing verification/readiness area**

Open `frontend/src/components/CaseDetailClient.tsx` and identify the block rendering contract readiness or verification actions.

- [ ] **Step 2: Add latest execution view model**

Import:

```ts
import { buildGenLayerExecutionViewModel } from "@/lib/genlayer-execution";
```

If `CaseDetailClient` receives platform data containing execution records, select the latest record for the current case. If it does not yet receive those records, add a local state placeholder populated by submit/status API responses:

```ts
const [genLayerExecution, setGenLayerExecution] = useState<GenLayerExecutionRecord | null>(null);
const genLayerView = buildGenLayerExecutionViewModel(
  genLayerExecution,
  contractReadiness.isReady,
);
```

Import the type:

```ts
import type { GenLayerExecutionRecord } from "@/lib/platform/types";
```

- [ ] **Step 3: Add submit and check-state actions**

Add client actions using existing operator/demo auth header patterns in the component:

```ts
async function submitGenLayerVerification() {
  const response = await fetch("/api/genlayer/verify-case", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-lexnet-operator-id": "operator-demo",
    },
    body: JSON.stringify({ caseId: commerceCase.id, walletConnected: true }),
  });
  const payload = await response.json();
  if (payload.execution) {
    setGenLayerExecution(payload.execution);
  }
}

async function checkGenLayerState() {
  const response = await fetch(`/api/genlayer/cases/${commerceCase.id}`, {
    headers: {
      "x-lexnet-operator-id": "operator-demo",
      "x-lexnet-wallet-connected": "true",
    },
  });
  const payload = await response.json();
  if (payload.execution) {
    setGenLayerExecution(payload.execution);
  }
}
```

- [ ] **Step 4: Render proof panel with safe labels**

Add panel markup near the existing verification panel:

```tsx
<Panel title="GenLayer execution proof" eyebrow="Contract state">
  <div className="space-y-3">
    <StatusChip tone={genLayerView.tone}>{genLayerView.label}</StatusChip>
    <p className="text-sm text-slate-300">{genLayerView.description}</p>
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className="rounded-full border border-cyan-400/40 px-4 py-2 text-sm text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!genLayerView.canSubmit}
        onClick={submitGenLayerVerification}
      >
        Submit verify_case
      </button>
      <button
        type="button"
        className="rounded-full border border-emerald-400/40 px-4 py-2 text-sm text-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!genLayerView.canCheckState}
        onClick={checkGenLayerState}
      >
        Check contract state
      </button>
    </div>
  </div>
</Panel>
```

Adjust class names to match existing button styles in the file. Do not add settlement/payment language.

- [ ] **Step 5: Run typecheck**

Run:

```powershell
npm exec tsc -- --noEmit
```

Expected: exit 0.

### Task 8: Update docs and map

**Files:**
- Modify: `README.md`
- Modify: `ARCHITECTURE.md`
- Modify: `docs/CURRENT_MAP.md`

- [ ] **Step 1: Update README GenLayer section**

Add text under `## GenLayer SDK Boundary`:

```markdown
A GenLayer transaction hash is treated as submission evidence only. LexNet marks a GenLayer verification as contract-state verified only after reading `get_case(case_id)` and finding a `verification_report` in the contract state.
```

- [ ] **Step 2: Update ARCHITECTURE GenLayer boundary**

Add:

```markdown
GenLayer execution records are stored separately from local verification reports. `submitted` means the SDK call returned; `state_verified` means contract `get_case` returned a verification report. UI labels must preserve this distinction and must not imply payment settlement or finality.
```

- [ ] **Step 3: Update CURRENT_MAP active files and routes**

Add:

```markdown
- `frontend/src/lib/genlayer-execution.ts` — maps GenLayer execution records to safe UI labels and actions.
- `/api/genlayer/cases/[caseId]` — demo-private contract state read-back for verification proof.
```

- [ ] **Step 4: Run doc grep for forbidden claims**

Run:

```powershell
git diff -- README.md ARCHITECTURE.md docs/CURRENT_MAP.md | Select-String -Pattern "funds released|paid|settled|escrow completed|final on-chain settlement" -CaseSensitive:$false
```

Expected: no matches outside the explicit forbidden-label list in the spec/plan.

### Task 9: Full verification and commit Phase B

**Files:**
- All Phase B files.

- [ ] **Step 1: Run full verification**

Run from `frontend/`:

```powershell
npm run test:platform
npm run test:domain
npm exec tsc -- --noEmit
npm run build
```

Expected: all pass.

- [ ] **Step 2: Verify local runtime data is ignored**

Run:

```powershell
git status --short --ignored "..\.lexnet-data"
```

Expected:

```text
!! ../.lexnet-data/
```

- [ ] **Step 3: Commit Phase B**

Run:

```powershell
git add ..\docs\superpowers\specs\2026-05-13-genlayer-execution-verification-design.md ..\docs\superpowers\plans\2026-05-13-phase-a-b-genlayer-verification.md ..\README.md ..\ARCHITECTURE.md ..\docs\CURRENT_MAP.md src\app\api\genlayer\cases src\app\api\genlayer\verify-case\route.ts src\components\CaseDetailClient.tsx src\lib\genlayer-client.ts src\lib\genlayer-execution.ts src\lib\platform\store.ts src\lib\platform\types.ts tests\platform.test.ts

git commit -m @'
feat: verify GenLayer execution from contract state

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
'@
```

Expected: commit succeeds and hooks, if any, pass.

## Phase C-D Follow-Up Scope

Phase C and D are intentionally not bundled into the Phase B implementation because they require production choices not present in the current codebase:

- Production auth provider and session model.
- Managed database vendor and migration strategy.
- Evidence storage provider and retention policy.
- Deployment target, environment management, observability, and pilot runbook.

After Phase B passes, create separate specs and plans:

1. `2026-05-13-production-auth-storage-design.md`
2. `2026-05-13-pilot-deployment-packaging-design.md`

Each should be implemented as a separate, testable project.

## Self-Review

- Spec coverage: covers Phase A stabilization and all Phase B requirements from `2026-05-13-genlayer-execution-verification-design.md`.
- Placeholder scan: no TBD/TODO/fill-in instructions are used.
- Type consistency: `GenLayerExecutionRecord`, `GenLayerExecutionStatus`, `readCase`, `classifyGenLayerCaseProof`, and API route names are consistent across tasks.
