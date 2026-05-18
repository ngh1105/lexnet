# MVP Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Address the 4 actionable findings from the post-merge code review of the MVP completion branches.

**Architecture:** All fixes touch already-merged code on `main`. Two type-safety fixes (non-null assertion, unsafe cast), one consistency fix (auth header for submit-evidence), and one DRY refactor (extract write helper in genlayer-client).

**Tech Stack:** TypeScript, Next.js App Router, Vitest.

---

## File Map

**F1 — submit-evidence contractAddress null guard**
- Modify: `frontend/src/app/api/genlayer/submit-evidence/route.ts:215`

**F2 — CaseDetailClient unsafe cast**
- Modify: `frontend/src/components/CaseDetailClient.tsx:380-388`

**F3 — submit-evidence Authorization header**
- Modify: `frontend/src/lib/genlayer-verify-request.ts` (add sibling builder)
- Modify: `frontend/src/components/CaseDetailClient.tsx:306-320`

**F4 — Extract executeWrite helper in genlayer-client**
- Modify: `frontend/src/lib/genlayer-client.ts`

---

## Branches

- `fix/f1-submit-evidence-null-guard`
- `fix/f2-f3-case-detail-fixes` (combined — same file)
- `fix/f4-genlayer-client-dry`

---

## Task F1: submit-evidence contractAddress null guard

**Files:** Modify `frontend/src/app/api/genlayer/submit-evidence/route.ts`

- [ ] **Step 1: Branch**

```bash
cd E:/Dapp/LexNet
git checkout main && git pull && git checkout -b fix/f1-submit-evidence-null-guard
```

- [ ] **Step 2: Apply fix**

Replace:

```ts
const contractAddress = readiness.contractAddress!;
```

with (matches `create-case/route.ts:111`):

```ts
const contractAddress = readiness.contractAddress ?? "";
```

- [ ] **Step 3: Run tests + tsc**

```bash
npm --prefix frontend run test:platform
npm --prefix frontend run test:domain
npm --prefix frontend exec tsc -- -p frontend/tsconfig.json --noEmit
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/api/genlayer/submit-evidence/route.ts
git commit -m "fix: replace non-null assertion with fallback for contractAddress"
```

---

## Task F2: CaseDetailClient unsafe cast in poll callback

**Files:** Modify `frontend/src/components/CaseDetailClient.tsx`

- [ ] **Step 1: Branch**

```bash
cd E:/Dapp/LexNet
git checkout main && git checkout -b fix/f2-f3-case-detail-fixes
```

- [ ] **Step 2: Add type guard helper**

Near the top of `frontend/src/components/CaseDetailClient.tsx` (after the import block, before the default export), add:

```ts
function hasExecutionRecord(
  value: unknown,
): value is { execution: GenLayerExecutionRecord } {
  return (
    typeof value === "object" &&
    value !== null &&
    "execution" in value &&
    Boolean((value as { execution?: unknown }).execution)
  );
}
```

- [ ] **Step 3: Replace double cast in poll callback**

Find lines around 380-388. Replace:

```ts
if (pollResult.lastResponse && (pollResult.lastResponse as { execution?: GenLayerExecutionRecord }).execution) {
  setGenLayerExecution((pollResult.lastResponse as { execution: GenLayerExecutionRecord }).execution);
}
```

with:

```ts
if (hasExecutionRecord(pollResult.lastResponse)) {
  setGenLayerExecution(pollResult.lastResponse.execution);
}
```

- [ ] **Step 4: Verify tsc**

```bash
npm --prefix frontend exec tsc -- -p frontend/tsconfig.json --noEmit
```

Expected: clean.

---

## Task F3: submit-evidence Authorization header parity

**Files:**
- Modify: `frontend/src/lib/genlayer-verify-request.ts`
- Modify: `frontend/src/components/CaseDetailClient.tsx`
- Modify: `frontend/tests/genlayer-verify-request.test.ts`

Rationale: `verify-case` includes optional `Authorization: Bearer <token>` via `buildVerifyCaseRequest`. The fire-and-forget submit-evidence fetch builds inline and skips the auth header — if `NEXT_PUBLIC_LEXNET_DEMO_PRIVATE_API_TOKEN` is set, calls will be rejected.

- [ ] **Step 1: Add `buildSubmitEvidenceRequest` builder**

Append to `frontend/src/lib/genlayer-verify-request.ts`:

```ts
export interface SubmitEvidenceRequestInput {
  caseId: string;
  evidenceUrls: string[];
  walletConnected: boolean;
  connectedWalletAddress?: string;
  demoToken?: string;
}

export function buildSubmitEvidenceRequest(input: SubmitEvidenceRequestInput): RequestInit {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-lexnet-operator-id": "operator-demo",
  };
  if (input.demoToken) {
    headers["Authorization"] = `Bearer ${input.demoToken}`;
  }
  return {
    method: "POST",
    headers,
    body: JSON.stringify({
      caseId: input.caseId,
      evidenceUrls: input.evidenceUrls,
      walletConnected: input.walletConnected,
      connectedWalletAddress: input.connectedWalletAddress ?? null,
    }),
  };
}
```

- [ ] **Step 2: Add tests**

Append to `frontend/tests/genlayer-verify-request.test.ts`:

```ts
test("buildSubmitEvidenceRequest includes Authorization when demoToken is provided", () => {
  const init = buildSubmitEvidenceRequest({
    caseId: "case-1",
    evidenceUrls: ["https://example.com/doc.pdf"],
    walletConnected: true,
    connectedWalletAddress: "0xabc",
    demoToken: "secret",
  });
  const headers = init.headers as Record<string, string>;
  assert.equal(headers["Authorization"], "Bearer secret");
  assert.equal(headers["x-lexnet-operator-id"], "operator-demo");
  const body = JSON.parse(init.body as string);
  assert.deepEqual(body, {
    caseId: "case-1",
    evidenceUrls: ["https://example.com/doc.pdf"],
    walletConnected: true,
    connectedWalletAddress: "0xabc",
  });
});

test("buildSubmitEvidenceRequest omits Authorization when demoToken is empty", () => {
  const init = buildSubmitEvidenceRequest({
    caseId: "case-2",
    evidenceUrls: [],
    walletConnected: false,
  });
  const headers = init.headers as Record<string, string>;
  assert.equal(headers["Authorization"], undefined);
  const body = JSON.parse(init.body as string);
  assert.equal(body.connectedWalletAddress, null);
});
```

Update import at top:

```ts
import {
  buildSubmitEvidenceRequest,
  buildVerifyCaseRequest,
} from "@/lib/genlayer-verify-request";
```

- [ ] **Step 3: Wire builder into CaseDetailClient**

Update import in `frontend/src/components/CaseDetailClient.tsx`:

```ts
import { buildSubmitEvidenceRequest, buildVerifyCaseRequest } from "@/lib/genlayer-verify-request";
```

Replace the inline submit-evidence fetch (around lines 306-320):

```ts
fetch("/api/genlayer/submit-evidence", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-lexnet-operator-id": "operator-demo",
  },
  body: JSON.stringify({
    caseId,
    evidenceUrls: urls,
    walletConnected: isConnected,
    connectedWalletAddress: address,
  }),
}).catch((err) => {
  console.log("submit_evidence contract call failed:", err);
});
```

with:

```ts
fetch(
  "/api/genlayer/submit-evidence",
  buildSubmitEvidenceRequest({
    caseId,
    evidenceUrls: urls,
    walletConnected: isConnected,
    connectedWalletAddress: address,
    demoToken: process.env.NEXT_PUBLIC_LEXNET_DEMO_PRIVATE_API_TOKEN,
  }),
).catch((err) => {
  console.log("submit_evidence contract call failed:", err);
});
```

- [ ] **Step 4: Run tests + tsc**

```bash
npm --prefix frontend run test:platform
npm --prefix frontend run test:domain
npm --prefix frontend exec tsc -- -p frontend/tsconfig.json --noEmit
```

Expected: all pass.

- [ ] **Step 5: Commit F2 + F3 together**

```bash
git add frontend/src/components/CaseDetailClient.tsx frontend/src/lib/genlayer-verify-request.ts frontend/tests/genlayer-verify-request.test.ts
git commit -m "fix: type-safe poll narrowing and auth header for submit-evidence"
```

---

## Task F4: Extract executeWrite helper in genlayer-client

**Files:** Modify `frontend/src/lib/genlayer-client.ts`

Rationale: `verifyCase`, `createCase`, `submitEvidence` repeat the same 8-line pattern (pick `writeContract ?? callContract`, throw if missing, call with `{address, functionName, args, value: 0n}`, normalize result).

- [ ] **Step 1: Branch**

```bash
cd E:/Dapp/LexNet
git checkout main && git checkout -b fix/f4-genlayer-client-dry
```

- [ ] **Step 2: Refactor `createGenLayerClientAdapter`**

In `frontend/src/lib/genlayer-client.ts`, replace the body of `createGenLayerClientAdapter`:

```ts
export function createGenLayerClientAdapter({
  sdk,
  rpcUrl,
}: GenLayerClientAdapterOptions): GenLayerClientAdapter {
  const createClient = sdk.createClient ?? sdk.createGenLayerClient;
  if (!createClient) {
    throw new Error("genlayer-js client factory is unavailable.");
  }

  const client = createClient({ endpoint: rpcUrl });

  async function executeWrite(
    contractAddress: string,
    functionName: "verify_case" | "create_case" | "submit_evidence",
    args: string[],
  ): Promise<GenLayerExecutionResult> {
    const execute = client.writeContract ?? client.callContract;
    if (!execute) {
      throw new Error("genlayer-js contract execution method is unavailable.");
    }
    return normalizeExecutionResult(
      await execute({
        address: contractAddress as `0x${string}`,
        functionName,
        args,
        value: 0n,
      }),
    );
  }

  return {
    async createCase(input) {
      const request = buildGenLayerCreateCaseRequest(input);
      return executeWrite(request.contractAddress, request.method, request.args);
    },
    async submitEvidence(input) {
      const request = buildGenLayerSubmitEvidenceRequest(input);
      return executeWrite(request.contractAddress, request.method, request.args);
    },
    async verifyCase(input) {
      const request = buildGenLayerVerifyCaseRequest({
        contractAddress: input.contractAddress,
        method: "verify_case",
        payload: { case_id: input.caseId },
      });
      return executeWrite(request.contractAddress, request.method, request.args);
    },
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
    },
  };
}
```

- [ ] **Step 3: Run tests + tsc**

```bash
npm --prefix frontend run test:platform
npm --prefix frontend run test:domain
npm --prefix frontend exec tsc -- -p frontend/tsconfig.json --noEmit
```

Expected: all green. Behavior unchanged — pure deduplication.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/genlayer-client.ts
git commit -m "refactor: extract executeWrite helper to dedupe contract write methods"
```

---

## Merge

After all three branches green:

```bash
cd E:/Dapp/LexNet
git checkout main
git merge fix/f1-submit-evidence-null-guard
git merge fix/f2-f3-case-detail-fixes
git merge fix/f4-genlayer-client-dry
git push origin main
```
