You are Claude Code Web3/Contract implementation worker for LexNet.

Mode: implementation.
Model intent: Opus xhigh.

Read first:
- CLAUDE.md
- docs/CURRENT_MAP.md
- docs/claude-code-subteam/reports/web3-contract-audit.md
- frontend/src/lib/genlayer-client.ts
- frontend/src/app/api/genlayer/verify-case/route.ts
- frontend/src/app/api/genlayer/cases/[caseId]/route.ts

Owned files:
- frontend/src/lib/genlayer-client.ts
- frontend/src/app/api/genlayer/verify-case/route.ts
- frontend/src/app/api/genlayer/cases/[caseId]/route.ts

Goal:
Implement safe GenLayer API response redaction and stricter proof classification.

Requirements:
1. Do not return raw SDK write/read results from API JSON responses.
2. Keep persisted execution records safe and unchanged in shape unless a minimal proof shape improvement is needed.
3. `classifyGenLayerCaseProof` must not mark `state_verified` for any truthy verification_report. It should require a valid object report with:
   - `verdict` string in APPROVE | REVISE | REJECT | SPLIT_RECOMMENDED
   - `score` number between 0 and 100
   - requested case id match when expected case id is supplied
4. Preserve returned fields used by the UI: `status`, `proofPending`, `stateVerified`, `execution`, `error`, `blockingReasons`.
5. Do not edit tests because existing test files have user changes. If tests need updates, report exact recommended changes instead.
6. Keep copy recommendation-only; no custody, payout, escrow finality, or fake settlement claims.

Constraints:
- Edit only owned files.
- Avoid unrelated refactors.
- Do not inspect/edit genlayer-js vendored code.
- Do not run package install.

After editing, return exactly:
Summary:
Changed files:
Tests/verification:
Risks:
Recommended test updates:
Next recommended task:
