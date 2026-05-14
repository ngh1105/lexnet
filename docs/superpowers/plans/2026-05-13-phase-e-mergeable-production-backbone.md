# Phase E Mergeable Production Backbone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the Phase E production-backbone PR so it is mergeable, verified, and no longer wastes agent context on stale docs or cache artifacts.

**Architecture:** Keep Phase E narrow: production auth hardening remains centralized in `frontend/src/lib/platform/production-auth.ts` and `frontend/src/lib/platform/auth.ts`; route files only await the shared mutation gate. Token cleanup is handled with `.ignore`, `.claudeignore`, and stale 2026-05-12 plan/spec deletions.

**Tech Stack:** Next.js App Router, TypeScript, Node `crypto`, Web `Request`, Node test runner via `tsx --test`, `rg`, Git.

---

## File Map

- Modify: `.claudeignore` - exclude Claude cache/worktrees, stale agent docs, lockfiles, vendored SDK, and build artifacts from Claude Code search context.
- Create: `.ignore` - make `rg` and similar default searches skip the same heavy paths.
- Delete: `docs/superpowers/plans/2026-05-12-*.md` - remove old 2026-05-12 implementation plans from active docs.
- Delete: `docs/superpowers/specs/2026-05-12-*.md` - remove old 2026-05-12 specs from active docs.
- Modify: `frontend/src/lib/platform/production-auth.ts` - validate the actual request body hash before trusting the HMAC payload.
- Modify: `frontend/src/lib/platform/auth.ts` - make `authorizePlatformMutation` async because production auth must read the request body clone.
- Modify: `frontend/src/app/api/admin/backup/route.ts` - await the shared mutation authorization.
- Modify: `frontend/src/app/api/genlayer/verify-case/route.ts` - await the shared mutation authorization.
- Modify: `frontend/src/app/api/passports/route.ts` - await the shared mutation authorization.
- Modify: `frontend/tests/platform.test.ts` - cover body-hash mismatch and update async production auth tests.

## Task 1: Confirm Phase E Worktree And Existing Diff

**Files:**
- Read only: `E:/Dapp/LexNet/.claude/worktrees/production-backbone`

- [ ] **Step 1: Check branch and status**

Run:

```bash
git -C E:/Dapp/LexNet/.claude/worktrees/production-backbone branch --show-current
git -C E:/Dapp/LexNet/.claude/worktrees/production-backbone status --short
```

Expected:

```text
worktree-production-backbone
```

Status may include `.claudeignore`, `.ignore`, deleted `docs/superpowers/...2026-05-12...`, production auth files, route files, and `frontend/tests/platform.test.ts`.

- [ ] **Step 2: Confirm remote divergence**

Run:

```bash
git -C E:/Dapp/LexNet/.claude/worktrees/production-backbone rev-list --left-right --count origin/worktree-production-backbone...HEAD
```

Expected:

```text
0	5
```

If the left number is not `0`, fetch and inspect before continuing because the remote has new commits that this plan does not account for.

## Task 2: Finish Body-Hash Production Auth

**Files:**
- Modify: `frontend/src/lib/platform/production-auth.ts`
- Modify: `frontend/src/lib/platform/auth.ts`
- Modify: `frontend/src/app/api/admin/backup/route.ts`
- Modify: `frontend/src/app/api/genlayer/verify-case/route.ts`
- Modify: `frontend/src/app/api/passports/route.ts`
- Test: `frontend/tests/platform.test.ts`

- [ ] **Step 1: Verify the failing test exists**

Open `frontend/tests/platform.test.ts` and confirm this test exists:

```ts
test("resolveProductionAuthContext rejects mismatched request body hash", async () => {
  resetProductionAuthNonceCacheForTests();
  const timestamp = "1770000000";
  const nonce = "nonce-body-mismatch";
  const signedBody = JSON.stringify({ published: true });
  const actualBody = JSON.stringify({ published: false });
  const bodySha256Hex = "4b08f22d9467f26b0d9aaef22984f5426204b62ef4f5a2de83285cacf7b8111f";
  const request = new Request("https://lexnet.example/api/passports", {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-lexnet-production-operator-id": "operator-demo",
      "x-lexnet-production-auth-timestamp": timestamp,
      "x-lexnet-production-auth-nonce": nonce,
      "x-lexnet-production-auth-body-sha256": bodySha256Hex,
      "x-lexnet-production-auth-signature": buildProductionAuthSignature({
        method: "PATCH",
        pathname: "/api/passports",
        operatorId: "operator-demo",
        timestamp,
        nonce,
        bodySha256Hex,
        secret: "production-secret",
      }),
    },
    body: actualBody,
  });

  assert.notEqual(actualBody, signedBody);

  const context = await resolveProductionAuthContext(
    request,
    {
      LEXNET_PRODUCTION_AUTH_MODE: "trusted-header",
      LEXNET_PRODUCTION_AUTH_SECRET: "production-secret",
    },
    1770000000,
  );

  assert.equal(context.authorized, false);
  if (!context.authorized) {
    assert.equal(context.code, "invalid_signature");
    assert.equal(context.reason, "Production authentication signature is invalid.");
  }
});
```

- [ ] **Step 2: Run the platform test before implementation**

Run:

```bash
npm --prefix E:/Dapp/LexNet/.claude/worktrees/production-backbone/frontend run test:platform
```

Expected if the worktree is mid-edit:

```text
ERROR: "await" can only be used inside an "async" function
```

If the test already passes, continue to Step 5 and inspect that the implementation matches Step 3 and Step 4.

- [ ] **Step 3: Make production auth read and verify the actual body**

In `frontend/src/lib/platform/production-auth.ts`, add this helper near `consumeNonce`:

```ts
async function hashRequestBody(request: Request): Promise<string> {
  const body = Buffer.from(await request.clone().arrayBuffer());
  return createHash("sha256").update(body).digest("hex");
}
```

Change the resolver signature:

```ts
export async function resolveProductionAuthContext(
  request: Request,
  env: ProductionAuthEnv,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<ProductionAuthContext> {
```

After timestamp and clock-skew validation, before building the expected signature, add:

```ts
  if (bodySha256Hex !== await hashRequestBody(request)) {
    return {
      authorized: false,
      status: 401,
      code: "invalid_signature",
      reason: "Production authentication signature is invalid.",
    };
  }
```

- [ ] **Step 4: Await production auth from mutation authorization and routes**

In `frontend/src/lib/platform/auth.ts`, change:

```ts
export async function authorizePlatformMutation(
  request: Request,
  env: DemoPrivateApiEnv,
  store: PlatformStore,
  nowSeconds?: number,
): Promise<PlatformMutationAuthorization> {
```

and:

```ts
  const context = await resolveProductionAuthContext(request, env, nowSeconds);
```

In `frontend/src/app/api/admin/backup/route.ts`, make the store mutation callback async:

```ts
  const store = await mutatePlatformStore(async (draft) => {
    const authorization = await authorizePlatformMutation(request, process.env, draft);
```

In `frontend/src/app/api/genlayer/verify-case/route.ts`, change:

```ts
  const authorization = await authorizePlatformMutation(request, process.env, store);
```

In `frontend/src/app/api/passports/route.ts`, update both POST and PATCH:

```ts
  const authorization = await authorizePlatformMutation(request, process.env, currentStore);
```

- [ ] **Step 5: Update async tests**

In `frontend/tests/platform.test.ts`, all tests that call `resolveProductionAuthContext` or `authorizePlatformMutation` must be async and must await the call.

Examples:

```ts
test("resolveProductionAuthContext rejects stale timestamps", async () => {
  const context = await resolveProductionAuthContext(request, env, 1770000000);
});
```

```ts
test("authorizePlatformMutation accepts production mutation with valid production auth", async () => {
  const authorization = await authorizePlatformMutation(request, env, createDefaultPlatformStore(), 1770000000);
});
```

- [ ] **Step 6: Run targeted verification**

Run:

```bash
npm --prefix E:/Dapp/LexNet/.claude/worktrees/production-backbone/frontend run test:platform
```

Expected:

```text
# tests 91
# pass 91
# fail 0
```

## Task 3: Finish Token-Waste Cleanup In The Phase E Worktree

**Files:**
- Modify: `.claudeignore`
- Create: `.ignore`
- Delete: `docs/superpowers/plans/2026-05-12-demo-readiness.md`
- Delete: `docs/superpowers/plans/2026-05-12-docs-demo-readiness-cleanup.md`
- Delete: `docs/superpowers/plans/2026-05-12-full-command-center-demo-seed.md`
- Delete: `docs/superpowers/plans/2026-05-12-product-demo-command-center.md`
- Delete: `docs/superpowers/plans/2026-05-12-production-backbone.md`
- Delete: `docs/superpowers/plans/2026-05-12-production-hardening-and-demo-polish.md`
- Delete: `docs/superpowers/plans/2026-05-12-review-findings-fix-plan.md`
- Delete: `docs/superpowers/specs/2026-05-12-commerce-trust-polish.md`
- Delete: `docs/superpowers/specs/2026-05-12-demo-readiness-design.md`
- Delete: `docs/superpowers/specs/2026-05-12-docs-demo-readiness-cleanup-design.md`
- Delete: `docs/superpowers/specs/2026-05-12-full-command-center-demo-seed-design.md`
- Delete: `docs/superpowers/specs/2026-05-12-onchain-demo-readiness-design.md`
- Delete: `docs/superpowers/specs/2026-05-12-production-backbone-design.md`
- Delete: `docs/superpowers/specs/2026-05-12-token-optimization-design.md`

- [ ] **Step 1: Tighten Claude ignore**

Set `.claudeignore` to include these sections:

```text
# Vendored SDK - not active source
genlayer-js/

# Claude worktrees/cache - duplicated repo snapshots
.claude/

# Archived docs - stale, out of date
docs/archive/

# Historical agent plans/specs - open only by explicit request
docs/superpowers/

# Agent tooling - not project code
.agent/
.shared/

# Dependencies
frontend/node_modules/
genlayer-js/node_modules/

# Large generated dependency locks/artifacts
frontend/package-lock.json
genlayer-js/package-lock.json
genlayer-js/*.tgz

# Build artifacts
frontend/.next/
```

- [ ] **Step 2: Add repo search ignore**

Create `.ignore` with:

```text
# Keep repo-wide searches focused on active product code.

.git/
.claude/
.agent/
.shared/

docs/archive/
docs/superpowers/

genlayer-js/
frontend/node_modules/
genlayer-js/node_modules/
frontend/.next/

frontend/package-lock.json
genlayer-js/package-lock.json
genlayer-js/*.tgz
```

- [ ] **Step 3: Confirm old 2026-05-12 plans/specs are deleted**

Run:

```bash
git -C E:/Dapp/LexNet/.claude/worktrees/production-backbone diff --name-status -- docs/superpowers
```

Expected: only `D` rows for the 2026-05-12 files listed in this task.

- [ ] **Step 4: Verify search surface**

Run:

```bash
rg --files | Measure-Object
rg --files | Select-String -Pattern '^\.claude/|^docs/superpowers/|^genlayer-js/|package-lock\.json|\.tgz$'
```

Expected:

```text
Count    : 84
```

and no heavy path matches from the second command.

## Task 4: Typecheck And Merge-Gate Verification

**Files:**
- Read only.

- [ ] **Step 1: Run platform suite**

Run:

```bash
npm --prefix E:/Dapp/LexNet/.claude/worktrees/production-backbone/frontend run test:platform
```

Expected:

```text
# tests 91
# pass 91
# fail 0
```

- [ ] **Step 2: Run TypeScript no-emit**

Run:

```bash
npm --prefix E:/Dapp/LexNet/.claude/worktrees/production-backbone/frontend exec tsc -- --noEmit
```

Expected: exit code `0` and no TypeScript diagnostics.

- [ ] **Step 3: Inspect the diff for scope**

Run:

```bash
git -C E:/Dapp/LexNet/.claude/worktrees/production-backbone diff --stat
git -C E:/Dapp/LexNet/.claude/worktrees/production-backbone diff --name-status
```

Expected scope:

- Production auth body-hash and async mutation gate.
- Route callsites for async mutation gate.
- Platform tests.
- Token cleanup ignore files.
- Deleted stale 2026-05-12 plans/specs.

If unrelated files appear, stop and inspect before committing.

## Task 5: Commit And Push Phase E

**Files:**
- Git metadata only.

- [ ] **Step 1: Stage scoped files**

Run:

```bash
git -C E:/Dapp/LexNet/.claude/worktrees/production-backbone add .claudeignore .ignore frontend/src/lib/platform/production-auth.ts frontend/src/lib/platform/auth.ts frontend/src/app/api/admin/backup/route.ts frontend/src/app/api/genlayer/verify-case/route.ts frontend/src/app/api/passports/route.ts frontend/tests/platform.test.ts docs/superpowers
```

- [ ] **Step 2: Review staged diff**

Run:

```bash
git -C E:/Dapp/LexNet/.claude/worktrees/production-backbone diff --cached --stat
git -C E:/Dapp/LexNet/.claude/worktrees/production-backbone diff --cached --name-status
```

Expected: same scope as Task 4 Step 3.

- [ ] **Step 3: Commit**

Run:

```bash
git -C E:/Dapp/LexNet/.claude/worktrees/production-backbone commit -m "fix: finish production auth body hash gate"
```

- [ ] **Step 4: Push**

Run:

```bash
git -C E:/Dapp/LexNet/.claude/worktrees/production-backbone push origin worktree-production-backbone
```

- [ ] **Step 5: Confirm remote sync**

Run:

```bash
git -C E:/Dapp/LexNet/.claude/worktrees/production-backbone rev-list --left-right --count origin/worktree-production-backbone...HEAD
```

Expected:

```text
0	0
```

## Task 6: PR Handoff

**Files:**
- Read only.

- [ ] **Step 1: Summarize PR readiness**

Prepare a concise PR comment or handoff summary:

```markdown
Phase E update:

- Finished trusted-header production auth body-hash validation.
- Converted production mutation auth path to async and updated mutating routes.
- Added/kept tests for valid HMAC, query tamper, replayed nonce, stale timestamp, invalid signature, and mismatched body hash.
- Removed old 2026-05-12 plans/specs from active docs.
- Added search/context boundaries for Claude and rg.

Verification:
- npm --prefix frontend run test:platform
- npm --prefix frontend exec tsc -- --noEmit
- rg heavy-path visibility check
```

- [ ] **Step 2: Record next phase**

Add this sentence to the handoff:

```markdown
After Phase E merges, start Phase F as a separate PR focused only on pilot packaging and operator workflow.
```
