# Phase E PR Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile PR #1 (`worktree-production-backbone` → `main`) with the latest `origin/main` without adding scope beyond Phase E Production Backbone.

**Architecture:** This is a branch-stabilization plan, not a product-code feature plan. Use a non-rewriting merge from `origin/main` into the PR branch, resolve conflicts by preserving the current `main` baseline plus already-reviewed Phase E production-backbone behavior, then validate and push the reconciled branch.

**Tech Stack:** Git, GitHub CLI (`gh`), npm scripts, TypeScript, Next.js build, CodeRabbit CLI in WSL when available.

---

## File Structure

This plan should not create new product source files unless conflict resolution requires restoring already-reviewed Phase E code. Expected files touched by conflict resolution are whichever files Git reports as conflicted after merging `origin/main`; likely areas are:

- `frontend/src/lib/platform/production-auth.ts` — preserve trusted-header HMAC auth with method, pathname, raw query string, operator id, timestamp, nonce, body SHA-256, 60-second default skew, and nonce replay protection.
- `frontend/src/lib/platform/readiness.ts` — preserve configured-versus-enforced readiness semantics and adapter blocking reasons.
- `frontend/src/lib/platform/persistence-adapter.ts` — preserve filesystem-local versus managed-required adapter status.
- `frontend/src/lib/platform/evidence-policy.ts` — preserve public URL policy and production HTTPS-only enforcement.
- `frontend/src/app/api/passports/route.ts` — preserve production mutation authorization for passport mutations.
- `frontend/src/app/api/admin/backup/route.ts` — preserve serialized-store authorization inside backup mutation.
- `frontend/src/app/api/genlayer/verify-case/route.ts` — preserve production mutation authorization for GenLayer write submissions.
- `frontend/src/lib/lexnet-domain.ts` — preserve runtime-aware evidence policy use.
- `frontend/tests/platform.test.ts` — preserve production auth, readiness, evidence policy, and route authorization coverage.
- `frontend/tests/lexnet-domain.test.ts` — preserve production evidence URL test coverage.
- `README.md`, `ARCHITECTURE.md`, `docs/CURRENT_MAP.md`, `docs/PILOT_RUNBOOK.md`, `docs/superpowers/specs/2026-05-13-phase-e-production-backbone-design.md` — preserve documentation that keeps LexNet recommendation-only and documents the production backbone accurately.

Do not commit `.env.local`, `.lexnet-data/`, private keys, generated patches, local backups, or temporary WSL clone artifacts.

---

### Task 1: Snapshot Current Branch and Remote State

**Files:**
- Modify: none

- [ ] **Step 1: Confirm the working tree starts clean**

Run from `E:\Dapp\LexNet\.claude\worktrees\production-backbone`:

```bash
git status --short
```

Expected: no output. If tracked or untracked files appear, inspect them before continuing. Do not discard user work.

- [ ] **Step 2: Confirm the current branch and PR metadata**

Run:

```bash
git branch --show-current
gh pr view 1 --json baseRefName,headRefName,mergeStateStatus,state,title,url
```

Expected branch: `worktree-production-backbone` or the active PR worktree branch. Expected PR state: `OPEN`, head `worktree-production-backbone`, base `main`, with `mergeStateStatus` currently `DIRTY` or still needing reconciliation.

- [ ] **Step 3: Fetch current remote refs**

Run:

```bash
git fetch origin
```

Expected: command exits 0 and updates `origin/main`.

- [ ] **Step 4: Record the merge base and latest commits for review**

Run:

```bash
git merge-base HEAD origin/main
git log --oneline --decorate -5 HEAD
git log --oneline --decorate -5 origin/main
```

Expected: command exits 0. Keep the output in the terminal transcript for conflict-resolution context.

---

### Task 2: Merge `origin/main` Without Rewriting PR History

**Files:**
- Modify: files reported by Git as conflicted or updated by the merge

- [ ] **Step 1: Merge `origin/main` into the PR branch**

Run:

```bash
git merge origin/main
```

Expected if clean: merge commit is created or merge stops with conflicts. Expected if conflicts occur: Git reports conflicted files and leaves conflict markers in those files. Do not rebase and do not force-push.

- [ ] **Step 2: List conflicted files if the merge stops**

Run only if Git reports conflicts:

```bash
git status --short
git diff --name-only --diff-filter=U
```

Expected: conflicted files are listed with unmerged status. Use this list as the only conflict-resolution target.

- [ ] **Step 3: Resolve conflicts by preserving Phase E behavior**

For each conflicted file, edit only the conflict regions. Keep the latest `main` baseline outside conflict regions and preserve these reviewed Phase E requirements where relevant:

```text
Production auth:
- LEXNET_PRODUCTION_AUTH_MODE=trusted-header is the only enforced production auth mode.
- LEXNET_PRODUCTION_AUTH_PROVIDER is descriptive only and never authorizes production mutations.
- HMAC payload includes method, pathname, raw query string, operator id, timestamp, nonce, and body SHA-256.
- Default clock skew is 60 seconds.
- Reused nonces are rejected within the clock-skew window.
- Authorization failure does not expose secrets, expected signatures, or payloads.

Production mutation authorization:
- Local demo and pilot delegate to demo-private auth.
- Production mutating routes use production trusted-header auth.
- `/api/passports`, `/api/admin/backup`, and `/api/genlayer/verify-case` remain protected for mutations.

Persistence readiness:
- Filesystem persistence remains local-demo/pilot only.
- Production reports managed-required until a real managed adapter exists.
- Managed persistence configured is distinct from managed persistence enforced.
- Adapter blocking reasons are preserved in readiness output.

Evidence policy:
- Raw evidence bodies are never fetched or stored.
- Production accepts public HTTPS URLs only.
- Private/internal hosts are rejected in all runtime modes.
- Local demo and pilot may accept public HTTP URLs but not localhost/private/internal URLs.

Docs and UI claims:
- LexNet remains recommendation-only.
- Do not claim custody, payouts, payment release, escrow completion, real value movement, or final settlement.
```

Expected: conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) are removed and the resulting code compiles conceptually.

- [ ] **Step 4: Verify no conflict markers remain**

Run:

```bash
git diff --check
git grep -n "<<<<<<<\|=======\|>>>>>>>"
```

Expected: `git diff --check` exits 0. `git grep` should return no matches. If `git grep` returns matches in non-conflict documentation examples, inspect them carefully and only proceed if they are legitimate; otherwise remove conflict markers.

- [ ] **Step 5: Stage resolved files and complete the merge**

Run:

```bash
git status --short
git add <each-resolved-file>
git commit
```

Use Git's generated merge commit message unless a message editor is unavailable. If a manual message is needed, use:

```bash
git commit -m "Merge origin/main into Phase E production backbone"
```

Expected: a non-rewriting merge commit is created. Do not use `--no-verify`.

---

### Task 3: Run Required Verification

**Files:**
- Modify: none unless verification exposes a real conflict-resolution bug

- [ ] **Step 1: Run platform tests**

Run:

```bash
npm --prefix frontend run test:platform
```

Expected: all platform tests pass. Previously expected count was around 90 tests, but trust the current suite output.

- [ ] **Step 2: Run domain tests**

Run:

```bash
npm --prefix frontend run test:domain
```

Expected: all domain tests pass. Previously expected count was around 116 tests, but trust the current suite output.

- [ ] **Step 3: Run TypeScript check with explicit project**

Run:

```bash
./frontend/node_modules/.bin/tsc -p frontend/tsconfig.json --noEmit
```

Expected: command exits 0. Use this command instead of `npm --prefix frontend exec tsc -- --noEmit`, which previously printed TypeScript help instead of checking the frontend project.

- [ ] **Step 4: Run production build**

Run:

```bash
npm --prefix frontend run build
```

Expected: Next.js build completes successfully.

- [ ] **Step 5: Run pilot readiness check**

Run:

```bash
npm --prefix frontend run pilot:check
```

Expected: command exits 0. Pilot/local warnings are acceptable only if the script treats them as non-blocking; production-mode blockers should still be reported honestly.

- [ ] **Step 6: Fix only merge-introduced failures**

If a command fails, inspect the error and edit the smallest affected conflict-resolution area. Do not add new product scope. After a fix, rerun the failing command, then rerun all commands from Step 1 through Step 5.

---

### Task 4: Run CodeRabbit Review for Stabilized Phase E Range

**Files:**
- Modify: none unless CodeRabbit reports a legitimate issue in the stabilized Phase E range

- [ ] **Step 1: Run CodeRabbit if the CLI is available in the current environment**

Preferred command if `coderabbit` is available:

```bash
coderabbit review --agent --base fad312f
```

Expected: review completes. Success target is zero critical or major findings, preferably zero findings.

- [ ] **Step 2: Use WSL CodeRabbit workflow if Windows cannot run the CLI**

If Windows cannot run `coderabbit`, use the existing WSL setup. Clone or refresh a temporary WSL copy rather than running CodeRabbit inside the Windows git worktree, because WSL cannot reliably interpret this worktree's Windows `.git` path.

Run in WSL:

```bash
rm -rf /tmp/lexnet-coderabbit-review
git clone https://github.com/ngh1105/lexnet.git /tmp/lexnet-coderabbit-review
cd /tmp/lexnet-coderabbit-review
git checkout worktree-production-backbone
coderabbit review --agent --base fad312f
```

Expected: review completes. Do not commit the WSL temp clone or generated patch files.

- [ ] **Step 3: Fix legitimate CodeRabbit findings only**

For any critical or major finding in the stabilized Phase E range, make the smallest local fix in the Windows worktree, run the relevant verification command, then rerun full verification from Task 3. Minor findings may be fixed if they are accurate and low-risk.

- [ ] **Step 4: Commit CodeRabbit fixes if any were needed**

Run only if files changed after CodeRabbit findings:

```bash
git status --short
git add <fixed-files>
git commit -m "fix: stabilize Phase E PR after review"
```

Expected: a normal commit is created. Do not use `--amend` unless the user explicitly requests it.

---

### Task 5: Push and Confirm PR Mergeability

**Files:**
- Modify: none

- [ ] **Step 1: Confirm clean working tree before push**

Run:

```bash
git status --short
```

Expected: no output.

- [ ] **Step 2: Push the reconciled branch**

Run:

```bash
git push origin worktree-production-backbone
```

Expected: push succeeds and updates PR #1. This is a normal push, not force push.

- [ ] **Step 3: Check PR merge state**

Run:

```bash
gh pr view 1 --json mergeStateStatus,state,url
```

Expected: PR state remains `OPEN` and `mergeStateStatus` no longer reports `DIRTY`. Acceptable non-DIRTY states may include GitHub states such as `CLEAN`, `UNSTABLE`, or `BLOCKED`; if it is not `DIRTY`, inspect whether remaining blockers are checks/reviews rather than merge conflicts.

- [ ] **Step 4: Report final status**

Report:

```text
- Merge/reconciliation result
- Verification command results
- CodeRabbit result or why it could not be run
- PR URL and mergeStateStatus
- Confirmation that no forbidden local files were committed
```

Expected: concise user-facing summary with the next recommended action.

---

## Self-Review

**Spec coverage:** This plan covers fetching `origin/main`, merging without rewriting history, conflict resolution constraints, verification commands, CodeRabbit review, push, and final PR merge-state check. It explicitly excludes deployment, Phase F, payment/settlement scope, and new product behavior.

**Placeholder scan:** No TBD/TODO placeholders remain. Commands, expected outcomes, and conflict-resolution rules are explicit.

**Type consistency:** No new runtime types or source interfaces are introduced by this stabilization plan. Existing Phase E names and environment variables match the approved spec and current docs.
