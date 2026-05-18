# Claude Code Subteam Task Board

## Active PM State

- Coordinator: Codex.
- Subteam runtime: Claude Code, `--model opus`, `--effort xhigh`.
- Verification preference: user said skip extra test run for setup phase.
- Current risk: active uncommitted user changes exist in frontend files. Subteams must avoid overwriting them.

## Backlog

### T0 - Architect Audit

- Agent: Architect.
- Mode: read-only.
- Goal: map current modules, ownership boundaries, and safe task slices.
- Owned files: none.
- Output: `docs/claude-code-subteam/reports/architect-audit.md`.
- Status: complete.
- Key findings:
  - High-conflict files: `frontend/src/lib/platform/store.ts`, `frontend/src/lib/platform/readiness.ts`, `frontend/src/lib/lexnet-domain.ts`, `frontend/src/lib/lexnet-types.ts`, `frontend/src/lib/lexnet-contract.ts`.
  - Best first maintenance task: update `docs/CURRENT_MAP.md` for `/api/platform/status`, `observability.ts`, and `passport-copy.ts`.
  - Baseline verification commands: `test:domain`, `test:platform`, `tsc --noEmit`, `build`, `pilot:check`.

### T1 - Docs Map Sync

- Agent: Docs.
- Mode: documentation implementation.
- Owned files: `docs/CURRENT_MAP.md` only.
- Goal: sync active file/route map with current repo.
- Output: `docs/claude-code-subteam/reports/docs-map-sync.md`.
- Status: complete, pending PM commit/stage decision.

### T2 - Frontend Polish Slice

- Agent: Frontend.
- Mode: implementation after PM approval.
- Owned files: exact component/page files selected per sprint.
- Goal: improve UX/copy without changing product truth claims.
- Status: queued.

### T3 - Platform/API Hardening Slice

- Agent: Platform/API.
- Mode: implementation after PM approval.
- Owned files: selected `frontend/src/lib/platform/*` and matching API routes.
- Goal: improve backend boundary, error handling, and readiness behavior.
- Status: queued.

### T4 - Web3/Contract Boundary Slice

- Agent: Web3/Contract.
- Mode: audit first, implementation only after PM approval.
- Owned files: `contracts/lexnet_commerce_core.py`, `frontend/src/lib/genlayer-*`, `frontend/src/lib/lexnet-contract.ts`.
- Goal: keep GenLayer integration honest and guarded.
- Status: queued.

### T5 - QA Regression Slice

- Agent: QA.
- Mode: test/review.
- Owned files: `frontend/tests/*` only unless PM expands scope.
- Goal: add or update focused tests for changed behavior.
- Status: queued.

### T6 - Security Review Slice

- Agent: Security.
- Mode: read-only review first.
- Owned files: none.
- Goal: review auth, public/private API boundary, secret leakage, and production claims.
- Output: `docs/claude-code-subteam/reports/security-audit.md`.
- Status: complete.
- Highest-priority findings:
  - Operator pages (`/`, `/cases/[id]`, `/passports`, `/platform`) render private store-backed data without page auth.
  - `/api/admin/backup` is `GET`, mutates audit state, and can export full platform store behind optional demo token.
  - Production persistence readiness can overstate managed persistence while routes still use filesystem helpers.
  - Production HMAC nonce replay is process-local only.
  - GenLayer APIs return raw SDK/contract data and should be redacted.

## Next Fix Candidates

### F1 - Operator Page Access Boundary

- Suggested agent: Platform/API or Frontend + Platform paired.
- Candidate owned files: selected pages under `frontend/src/app/*/page.tsx`, `frontend/src/lib/platform/auth.ts`, focused tests.
- Goal: block or authorize operator-only server-rendered pages outside safe local/demo mode.
- Status: candidate.

### F2 - Admin Backup Hardening

- Suggested agent: Platform/API.
- Candidate owned files: `frontend/src/app/api/admin/backup/route.ts`, `frontend/src/lib/platform/auth.ts`, `frontend/tests/platform.test.ts` if needed.
- Goal: make backup privileged and less leak-prone.
- Status: candidate.

### F3 - GenLayer Response Redaction

- Suggested agent: Web3/Contract.
- Candidate owned files: `frontend/src/app/api/genlayer/verify-case/route.ts`, `frontend/src/app/api/genlayer/cases/[caseId]/route.ts`, `frontend/src/lib/genlayer-execution.ts` if needed.
- Goal: return known-safe execution/proof fields only.
- Status: candidate.

