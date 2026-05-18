# LexNet MVP Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire LexNet UI to the deployed Studionet contract for real verify/create/submit-evidence flows, and close the highest-priority security findings (page auth gate, admin backup hardening).

**Architecture:** Frontend already calls `/api/genlayer/*` routes which use `createGenLayerClientAdapter` against `https://studio.genlayer.com/api`. Contract is deployed at `0x08a9897bbE5aEa24b41447f758FeD246035648B3`. The CaseDetailClient currently shows readiness state but does not POST to `/api/genlayer/verify-case`. We add: (1) verify wire + polling, (2) create_case + submit_evidence write paths, (3) auth gate for operator pages, (4) `/api/admin/backup` POST + auth.

**Tech Stack:** Next.js App Router, wagmi/RainbowKit, genlayer-js SDK, Vitest, TypeScript.

---

## File Map

**T1 — Verify wire**
- Modify: `frontend/src/components/CaseDetailClient.tsx` (verify button → POST `/api/genlayer/verify-case`)

**T2 — Read-back polling**
- Modify: `frontend/src/components/CaseDetailClient.tsx` (poll `/api/genlayer/cases/[caseId]` until proof returns)

**T3 — `create_case` write path**
- Modify: `frontend/src/lib/genlayer-client.ts` (add `createCase`)
- Create: `frontend/src/app/api/genlayer/create-case/route.ts`
- Modify: `frontend/src/components/NewCaseForm.tsx` (call new route after local create)
- Test: `frontend/tests/genlayer-client.test.ts`

**T4 — `submit_evidence` write path** (after T3)
- Modify: `frontend/src/lib/genlayer-client.ts` (add `submitEvidence`)
- Create: `frontend/src/app/api/genlayer/submit-evidence/route.ts`
- Modify: `frontend/src/components/CaseDetailClient.tsx` (evidence submit triggers contract call)
- Test: extend `frontend/tests/genlayer-client.test.ts`

**T5 — Operator page auth gate**
- Create: `frontend/src/middleware.ts`
- Modify: `frontend/src/lib/platform/auth.ts` (export `verifyOperatorRequest` for middleware)

**T6 — Admin backup hardening**
- Modify: `frontend/src/app/api/admin/backup/route.ts` (GET → POST, require auth, no mutation on read)

---

## Wave Order

1. **Wave 1 (parallel):** T1, T5, T6 (disjoint files)
2. **Wave 2 (parallel):** T2 (after T1 commits), T3
3. **Wave 3 (sequential):** T4 (after T3 merges)

---

## Verification per task

- All: `npm --prefix frontend run test:domain && npm --prefix frontend run test:platform`
- T1, T2, T4: smoke vs Studionet
- T3: smoke (create case → tx hash)
- T5: curl `/` without operator headers → 401/redirect
- T6: curl GET → 405; POST with auth → 200
