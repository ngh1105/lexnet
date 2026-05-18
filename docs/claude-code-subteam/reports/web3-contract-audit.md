Summary:
- Read-only audit completed; no files edited and vendored `genlayer-js/` was not inspected.
- The architecture consistently states recommendation-only behavior and keeps `submitted` distinct from `state_verified` in the documented boundary: `ARCHITECTURE.md:127-129`.
- Main risk areas are contract evidence fetching/validation, client-asserted wallet readiness, overly broad proof classification, and a few copy/seed phrases that can imply escrow or finality.

Boundary map:
- Contract state boundary: `contracts/lexnet_commerce_core.py` stores cases, evidence URLs, verification reports, and recommendation statuses only; it explicitly says no custody/transfer at `contracts/lexnet_commerce_core.py:48-54`.
- Contract write guards:
  - `create_case` validates required fields and positive referenced amount: `contracts/lexnet_commerce_core.py:74-85`.
  - `submit_evidence` requires seller sender and only accepts `ACTIVE` / `REVISION_REQUESTED`: `contracts/lexnet_commerce_core.py:110-115`.
  - `verify_case` only runs after `EVIDENCE_SUBMITTED`: `contracts/lexnet_commerce_core.py:136-140`.
- Frontend readiness/payload boundary: `frontend/src/lib/lexnet-contract.ts:102-145` computes contract/RPC/wallet readiness and blocking reasons; `frontend/src/lib/lexnet-contract.ts:182-196` builds the `verify_case` execution plan.
- SDK isolation boundary: app execution uses the adapter in `frontend/src/lib/genlayer-client.ts:126-181`; direct contract write is shaped as `verify_case(caseId)` with `value: 0n` at `frontend/src/lib/genlayer-client.ts:149-155`.
- API execution boundary: `/api/genlayer/verify-case` requires platform mutation auth, local case existence, readiness, then appends a `submitted` execution record: `frontend/src/app/api/genlayer/verify-case/route.ts:11-70`.
- API proof boundary: `/api/genlayer/cases/[caseId]` reads contract state and updates latest execution to `confirmed`, `state_verified`, or `failed`: `frontend/src/app/api/genlayer/cases/[caseId]/route.ts:15-82`.
- UI state boundary: `submitted` copy explicitly says proof is pending; `state_verified` says a verification report exists in contract state: `frontend/src/lib/genlayer-execution.ts:34-61`.

Correctness risks:
- `CaseDetailClient` computes UI readiness with `walletConnected: true` instead of actual wallet state, so “GenLayer ready” / submit enablement can disagree with the server guard: `frontend/src/components/CaseDetailClient.tsx:214-225`.
- Wallet readiness on the API is client-asserted through request body/headers, not cryptographically proven. This is acceptable only as a demo readiness hint, not as owner authorization: `frontend/src/app/api/genlayer/verify-case/route.ts:32-36`, `frontend/src/app/api/genlayer/cases/[caseId]/route.ts:27-30`.
- Contract proof classification treats any truthy `verification_report` as `state_verified`; it does not validate report schema, case ID, verdict, score, or source before upgrading state: `frontend/src/lib/genlayer-client.ts:112-123`.
- The contract accepts up to 8 evidence URLs but only fetches the first 3 for verification, which can create operator/user confusion about what evidence was actually reviewed: `contracts/lexnet_commerce_core.py:119-120`, `contracts/lexnet_commerce_core.py:222-228`.
- Evidence URL filtering is string-based and blocks obvious private IPv4/localhost patterns, but it does not visibly guard DNS resolution, redirects, or non-obvious IP encodings before `gl.nondet.web.get`: `contracts/lexnet_commerce_core.py:230-250`.
- `verify_case` writes `UNDER_AI_REVIEW` before nondeterministic execution. If GenVM writes are not fully reverted on nondet/validator failure, cases could stick in review: `contracts/lexnet_commerce_core.py:183-187`.
- Validator shape should be verified against GenLayer runtime behavior: it unwraps `leader_result.calldata` but validates `validator_result` directly, which may be correct or may reject depending on returned wrapper shape: `contracts/lexnet_commerce_core.py:170-181`.
- API responses return raw SDK execution/read objects, which can expose provider/RPC details beyond the safe execution model: `frontend/src/app/api/genlayer/verify-case/route.ts:69`, `frontend/src/app/api/genlayer/cases/[caseId]/route.ts:61-67`.

Copy/finality risks:
- Strong positives: architecture and UI repeatedly avoid custody/payout/finality claims: `ARCHITECTURE.md:10`, `ARCHITECTURE.md:129`, `frontend/src/components/CaseDetailClient.tsx:264-267`, `frontend/src/components/PlatformReadinessClient.tsx:156`.
- Strong positives: `Submitted to GenLayer` clearly says contract state proof is still pending: `frontend/src/lib/genlayer-execution.ts:34-41`.
- Strong positives: public passport copy frames trust passports as signals, not payment/custody/final settlement records: `frontend/src/components/PublicPassportClient.tsx:81-82`.
- Risk: demo seed title uses “escrow,” which conflicts with the no-custody posture even if only sample data: `frontend/src/lib/platform/demo-seed.ts:155-158`.
- Risk: labels like “AI Verdict” and “Settlement decision” can feel more final than recommendation-only if shown without nearby qualifier: `frontend/src/components/CaseDetailClient.tsx:389-391`, `frontend/src/lib/lexnet-domain.ts:321-323`.

Suggested implementation slices:
- Slice 1: Align client readiness with actual wallet state in `CaseDetailClient`, including owner-wallet env where available, so UI submit controls match API blocking reasons.
- Slice 2: Harden `classifyGenLayerCaseProof` with report schema validation and requested-case matching before returning `state_verified`.
- Slice 3: Sanitize GenLayer API responses to return only safe execution fields; avoid returning raw SDK read/write payloads to the browser.
- Slice 4: Clarify evidence scope by either limiting submitted URLs to the reviewed maximum or showing/storing which URLs were fetched for GenLayer verification.
- Slice 5: Rename demo “escrow” copy and soften final-sounding labels to “recommendation,” “operator decision,” or “review outcome.”
- Slice 6: Add contract/runtime tests for nondet validator shape, URL redirect/private host behavior, and failure rollback around `UNDER_AI_REVIEW`.

Verification commands:
- `npm --prefix frontend run test:domain`
- `npm --prefix frontend run test:platform`
- `npm --prefix frontend exec tsc -- -p frontend/tsconfig.json --noEmit`
- `npm --prefix frontend run pilot:check`
- `npm --prefix frontend run build`
- GenLayer-specific manual check after config: submit `verify_case`, confirm UI shows `submitted/proof pending`, then run state read-back and confirm only a valid contract report upgrades to `state_verified`.

Risks:
- Current boundary is honest at the product/copy level, but proof upgrade logic is too permissive.
- Demo wallet readiness is not an authorization primitive and should not be represented as signed owner consent.
- Evidence fetching remains the highest contract-side risk because external content, redirects, prompt injection, and reviewed-vs-submitted evidence scope affect verification integrity.
- No custody/private-key handling was found in the inspected frontend files.
