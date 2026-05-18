Summary:
Read-only audit complete. LexNet is a Next.js/App Router commerce trust demo/pilot platform with a GenLayer contract boundary, filesystem-backed platform layer, UI clients, scripts, and tests. Keep all work recommendation-only: no custody, payout execution, escrow finality, or fake settlement claims.

Module map:
- `contracts/` — GenLayer Python contract boundary. `contracts/lexnet_commerce_core.py` owns commerce case lifecycle, evidence submission, AI verification, and recommendation output.
- `frontend/src/lib/lexnet-*.ts` — core domain/service layer: types, pure commerce logic, verification adapters, contract readiness, backend-aware reads, local fallback storage.
- `frontend/src/lib/genlayer-*.ts` — narrow GenLayer SDK/execution boundary. App code should stay behind these adapters.
- `frontend/src/lib/platform/` — platform backend layer: store, auth, production auth, API helpers, passports, readiness, evidence policy, persistence status, observability, backup/demo data.
- `frontend/src/app/` — App Router pages and API routes.
- `frontend/src/components/` — dashboard, case detail, intake, passport, platform readiness, contract readiness, wallet status, shell UI.
- `frontend/src/providers/` — Web3/RainbowKit provider wiring.
- `frontend/scripts/` — demo seed/reset/dev/backup/restore, GenLayer readiness, pilot checks.
- `frontend/tests/` — active domain and platform coverage.
- `frontend/src/app/globals.css` — global visual system and likely UI conflict point.

Parallel task slices:
- Contract slice: `contracts/lexnet_commerce_core.py` only; coordinate if state machine or verification schema changes.
- Domain slice: `frontend/src/lib/lexnet-types.ts`, `lexnet-domain.ts`, `lexnet-verification.ts`, `lexnet-service.ts`, domain tests.
- GenLayer boundary slice: `frontend/src/lib/lexnet-contract.ts`, `genlayer-client.ts`, `genlayer-execution.ts`, GenLayer API routes/components.
- Platform backend slice: `frontend/src/lib/platform/*` plus `frontend/src/app/api/*`; best split further by auth/readiness/passports/store to reduce conflicts.
- Case workflow UI slice: `/cases/new`, `/cases/[id]`, `NewCaseForm.tsx`, `CaseDetailClient.tsx`, `ContractCallPreview.tsx`.
- Passport/platform UI slice: `/passports`, `/passport/[slug]`, `/platform`, `TrustPassportsClient.tsx`, `PublicPassportClient.tsx`, `PlatformReadinessClient.tsx`.
- Wallet/provider slice: `frontend/src/providers/*`, `WalletConnectStatus.tsx`, `WalletAwareReadiness.tsx`, layout wiring.
- Demo ops/test slice: `frontend/scripts/*`, `frontend/tests/*`, `pilot:check`, `verify:mvp`.

Shared-file conflict risks:
- High: `frontend/src/lib/platform/store.ts` — central persistence, DTO, audit, passport, queue, and case data helper hotspot.
- High: `frontend/src/lib/platform/readiness.ts` — cross-cutting production/auth/persistence/evidence/GenLayer readiness logic.
- High: `frontend/src/lib/lexnet-domain.ts` and `frontend/src/lib/lexnet-types.ts` — changes ripple through UI, tests, store, and contract previews.
- High: `frontend/src/lib/lexnet-contract.ts` — shared by readiness UI, GenLayer API, verification planning, and environment handling.
- Medium: `frontend/src/lib/platform/types.ts` — schema changes require coordinated updates across store, APIs, tests, and UI.
- Medium: `frontend/src/lib/platform/demo-seed.ts` and `frontend/tests/platform.test.ts` — likely touched by most platform/backend changes.
- Medium: `frontend/src/app/globals.css`, `frontend/src/app/layout.tsx`, `frontend/src/components/Sidebar.tsx` — UI teams can easily collide.
- Medium: `frontend/src/components/CommerceDashboardClient.tsx`, `TrustPassportsClient.tsx`, `PlatformReadinessClient.tsx` — broad feature clients with many data dependencies.
- Medium: API routes under `frontend/src/app/api/*` — auth/readiness/store changes may affect all route handlers.
- Documentation drift risk: `docs/CURRENT_MAP.md` omits newer active files/routes such as `/api/platform/status`, `observability.ts`, and `passport-copy.ts`.

Verification commands:
- `npm --prefix frontend run test:domain`
- `npm --prefix frontend run test:platform`
- `npm --prefix frontend exec tsc -- -p frontend/tsconfig.json --noEmit`
- `npm --prefix frontend run build`
- `npm --prefix frontend run pilot:check`
- `npm --prefix frontend run verify:mvp`
- UI changes should also run `npm --prefix frontend run dev` and verify the affected route manually on port `3002`.

Recommended first 3 tasks:
- Update `docs/CURRENT_MAP.md` to reflect current active files/routes, especially `/api/platform/status`, `observability.ts`, and `passport-copy.ts`.
- Split platform work ownership before coding: one owner for `store.ts`/types, one for readiness/auth/evidence policy, one for passports/public privacy.
- Run baseline verification before parallel work starts: `test:domain`, `test:platform`, `tsc --noEmit`, `build`, and `pilot:check`.

Risks:
- Parallel edits to `store.ts`, `readiness.ts`, `lexnet-domain.ts`, or `lexnet-types.ts` will create merge conflicts and behavioral regressions.
- Platform store remains filesystem-backed demo/pilot infrastructure; production claims require managed persistence and auth work first.
- Public passport and readiness endpoints must stay redacted: no raw wallets, evidence URLs, unpublished records, audit payloads, secrets, payout status, or settlement finality.
- GenLayer integration must distinguish submitted SDK calls from verified contract state.
- UI copy can accidentally overclaim settlement/payment behavior; keep wording to recommendations and trust signals only.
