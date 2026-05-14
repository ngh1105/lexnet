# LexNet Roadmap: Phase E To H

## Summary

Advance LexNet from the current pilot-ready MVP toward production-grade verification through four gated phases:

1. Phase E: make the production-backbone PR mergeable.
2. Phase F: package a credible pilot workflow.
3. Phase G: build the production foundation.
4. Phase H: complete GenLayer on-chain verification.

Each phase should be independently reviewable and mergeable. The roadmap intentionally avoids a single large PR because LexNet already has enough moving pieces around production auth, persistence, evidence policy, GenLayer execution, docs, and agent context size.

## Current Context

LexNet is an AI-verified commerce trust platform for commerce cases, evidence review, settlement recommendations, and privacy-safe trust passports. The current implementation is recommendation-only: it does not custody funds, execute payouts, move real value, or claim settlement finality.

The main branch contains the local-demo and pilot foundation: platform store, demo-private auth, pilot readiness, passport publishing, local backup/restore, GenLayer execution boundaries, and operator runbook.

The Phase E worktree currently contains production-backbone changes: trusted-header HMAC production auth, body-hash validation, evidence URL policy hardening, production readiness enforcement, token-waste cleanup, and deletion of old 2026-05-12 planning docs.

## Non-Goals

- Do not add payment custody or transfer paths in these phases.
- Do not claim final settlement from local verification or GenLayer submission alone.
- Do not build provider-specific OAuth until the production auth boundary is stable.
- Do not move all four phases in one PR.
- Do not keep large historical plans/specs in default agent search context.

## Phase E: Mergeable Production Backbone

Goal: make the existing Phase E PR mergeable with a narrow, reviewable finish.

Scope:

- Finish trusted-header HMAC production auth.
- Verify request method, path, query, operator, timestamp, nonce, and request body hash.
- Keep failure responses secret-safe.
- Keep nonce replay protection and clock-skew handling.
- Ensure mutating production routes use the production mutation gate.
- Keep local-demo and pilot behavior working.
- Remove stale 2026-05-12 planning docs from active docs.
- Add `.ignore` and tighten `.claudeignore` so default searches skip cache, vendored SDK, lockfiles, and historical plans/specs.

Exit criteria:

- `npm --prefix frontend run test:platform` passes.
- `npm --prefix frontend exec tsc -- --noEmit` passes.
- Default `rg --files` excludes `.claude/`, `docs/superpowers/`, `genlayer-js/`, lockfiles, and `.tgz` artifacts.
- The PR diff is explainable as production-auth hardening plus token-waste cleanup.

## Phase F: Pilot Package

Goal: make LexNet easy to run as a controlled pilot without making production claims.

Scope:

- Stabilize `pilot:prepare`, `pilot:check`, `demo:seed`, `demo:backup`, `demo:restore`, and `demo:dev`.
- Create a short operator checklist for setup, demo flow, after-demo backup/reset, and forbidden claims.
- Ensure seeded cases, queue items, verification reports, passports, and audit events support the core product story.
- Improve docs around demo-private headers and optional bearer token.
- Add tests for pilot script safety where missing.
- Keep `.lexnet-data/` local and ignored.

Exit criteria:

- A fresh clone can run the pilot workflow from docs.
- `pilot:check` distinguishes warnings from production blockers.
- The public passport demo remains privacy-safe.
- Demo flow does not imply custody, payout, or settlement finality.

## Phase G: Production Foundation

Goal: turn production mode from readiness reporting into real enforceable infrastructure boundaries.

Scope:

- Introduce a persistence adapter boundary that can support managed storage without rewriting route logic.
- Define production auth integration points while keeping trusted-header HMAC as a provider-neutral gateway mode.
- Define evidence storage and retention interfaces.
- Add audit/observability hooks for mutating routes.
- Make production readiness checks reflect enforced controls, not just configured environment variables.

Exit criteria:

- Production mode blocks mutating routes unless enforced auth is present.
- Production readiness reports managed persistence and evidence policy status accurately.
- Local filesystem persistence remains allowed only for local-demo/pilot modes.
- Tests cover configured-vs-enforced behavior.

## Phase H: GenLayer On-Chain Verification

Goal: complete a truthful on-chain verification path for `verify_case`.

Scope:

- Document deploy/config steps for `LexNetCommerceCore`.
- Configure contract address, RPC URL, network label, and wallet readiness.
- Submit `verify_case` through the existing `genlayer-client` adapter.
- Read back `get_case(case_id)` to verify contract state.
- Store GenLayer execution lifecycle separately from local verification reports.
- Display proof states as submitted, failed, state verified, or blocked.

Exit criteria:

- A case can submit `verify_case` when readiness passes.
- A transaction hash is treated as submission evidence only.
- LexNet marks state verified only when contract state includes a verification report.
- UI and docs avoid settlement finality claims.

## Architecture Principles

- Keep route code thin; centralize auth, persistence, evidence policy, and GenLayer boundaries in `frontend/src/lib/`.
- Preserve local-demo and pilot flows while making production stricter.
- Prefer narrow adapters over broad rewrites.
- Keep public DTOs privacy-safe by default.
- Keep agent context small by excluding generated artifacts, vendored code, caches, and historical plans from default searches.

## Verification Strategy

Phase-level verification should start targeted and broaden only at merge gates:

- Phase E: platform tests, typecheck, and search-surface check.
- Phase F: pilot commands, platform tests, and docs walkthrough.
- Phase G: platform tests, typecheck, production-mode route authorization checks, and readiness checks.
- Phase H: domain/platform tests, typecheck, guarded GenLayer readiness tests, and one manual network verification when configured.

Full build should run before merging phases that touch UI, Next.js routes, env config, or dependencies.

## Risks

- Large PRs can obscure security regressions. Mitigation: keep phases separate.
- Production auth can become provider-specific too early. Mitigation: keep trusted-header HMAC as the stable app boundary.
- GenLayer submission can be mistaken for final settlement. Mitigation: keep explicit proof-state language and tests.
- Agent token waste can return if historical docs and cache folders become visible again. Mitigation: maintain `.ignore`, `.claudeignore`, and compact docs.
