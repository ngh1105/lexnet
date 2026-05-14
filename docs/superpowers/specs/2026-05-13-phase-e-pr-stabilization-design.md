# Phase E PR Stabilization Design

## Goal

Make PR #1 (`worktree-production-backbone` → `main`) mergeable without adding product scope beyond Phase E Production Backbone.

## Current State

Phase E code has been implemented, tested, pushed, and reviewed by CodeRabbit with zero findings on the Phase E range. GitHub reports PR #1 as open with `mergeStateStatus: DIRTY`, which means the branch must be reconciled with `main` before merge.

## Scope

This phase is limited to PR stabilization:

- Fetch the current `origin/main` state.
- Reconcile `worktree-production-backbone` with `origin/main`.
- Resolve conflicts only where needed to preserve Phase E behavior.
- Re-run verification after conflict resolution.
- Push the reconciled branch back to PR #1.
- Confirm the PR merge state no longer reports `DIRTY`.

This phase does not deploy, start Phase F, change product behavior beyond conflict resolution, or add payment/settlement functionality.

## Reconciliation Strategy

Use a non-rewriting merge from `origin/main` into `worktree-production-backbone` unless there is a strong reason not to. The PR branch is already pushed and reviewed, so preserving history is safer than rebasing or force-pushing.

If conflicts appear, resolve them by keeping the latest `main` baseline plus the Phase E changes that were already reviewed:

- Production trusted-header HMAC auth with query/body metadata, nonce replay protection, and 60-second default skew.
- Production mutation authorization for mutating routes.
- Persistence adapter readiness semantics.
- Evidence URL policy enforcement.
- Readiness and pilot check reporting.
- Documentation updates that keep LexNet recommendation-only and avoid settlement/payment finality claims.

## Validation

After reconciliation, run:

```bash
npm --prefix frontend run test:platform
npm --prefix frontend run test:domain
./frontend/node_modules/.bin/tsc -p frontend/tsconfig.json --noEmit
npm --prefix frontend run build
npm --prefix frontend run pilot:check
```

Then run CodeRabbit review against the Phase E base commit if the range remains meaningful:

```bash
coderabbit review --agent --base fad312f
```

Finally, check:

```bash
git status --short
gh pr view 1 --json mergeStateStatus,state,url
```

## Success Criteria

- Working tree is clean after the stabilization commit.
- Verification commands pass.
- CodeRabbit has no critical or major findings for the stabilized Phase E range.
- PR #1 remains open and no longer reports `mergeStateStatus: DIRTY`.
- No secrets, `.env.local`, private keys, `.lexnet-data`, or generated temp patch files are committed.
