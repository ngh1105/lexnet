# Documentation and Demo Readiness Cleanup Design

## Goal

Bring the project documentation and repository state back in sync with the completed Production Backbone implementation so the next demo/setup pass starts from accurate information.

## Current State

The production backbone code is implemented and verified on `worktree-production-backbone`: platform store, backend API routes, dashboard backend summary, privacy-safe public passports, demo-private API guards, backup export, tests, build, and CodeRabbit review all pass.

The main project docs still describe LexNet as primarily browser `localStorage` backed. That is now stale because backend mode uses `.lexnet-data/store.json` plus the `frontend/src/lib/platform/` layer and `/api/*` routes. There is also an untracked root `package-lock.json` in the worktree, created accidentally during earlier command execution, that causes Next.js to warn about multiple lockfiles during build.

## Scope

In scope:

- Update `docs/CURRENT_MAP.md` so active source files, routes, commands, and storage model reflect the backend-backed product foundation.
- Update `ARCHITECTURE.md` so the architecture describes browser fallback plus filesystem platform store, platform APIs, demo-private auth, audit metadata, and public passport privacy boundaries.
- Update `README.md` with current setup/verification/demo notes, including required environment variables and the demo-private API flag.
- Inspect the untracked root `package-lock.json`; if it is confirmed to be accidental and redundant with `frontend/package-lock.json`, remove it from the worktree so builds no longer warn about multiple lockfiles.

Out of scope:

- Runtime behavior changes.
- New API routes, UI components, or tests beyond documentation verification.
- Database migration, production OAuth, or deployment infrastructure.
- Any changes to `genlayer-js`, secrets, or `.env.local`.

## Design

The cleanup should be documentation-first and conservative. The docs should describe the current implementation, not aspirational future work.

`docs/CURRENT_MAP.md` should become the quick orientation source for active code:

- LexNet remains an AI-verified commerce trust platform.
- Active storage is backend filesystem store at `.lexnet-data/store.json`, with localStorage retained as browser fallback/cache for demo flows.
- Active platform modules are `frontend/src/lib/platform/types.ts`, `store.ts`, `api.ts`, `auth.ts`, and `passports.ts`.
- Active pages include `/`, `/cases/new`, `/cases/[id]`, `/passports`, and `/passport/[slug]`.
- Active API routes include workspaces, operators, queue, passports, public passports, backup, and security status.
- Verification commands include platform tests, domain tests, TypeScript check, build, and CodeRabbit through WSL when requested.

`ARCHITECTURE.md` should explain the current layered model:

1. Domain layer remains pure commerce/evidence/passport logic.
2. Platform layer owns backend records, JSON persistence, safe fallbacks, audit events, public passport redaction, API helpers, and demo operator auth.
3. Next.js routes render backend-backed dashboard/passport flows and expose guarded APIs.
4. Browser localStorage is not the main production backbone, but remains a local demo fallback.
5. GenLayer UI must show readiness/previews only; no fake on-chain confirmation.

`README.md` should be practical:

- How to install and run the frontend.
- Which commands prove the project state.
- Which environment variables are optional public config versus demo-private API config.
- How public passport publishing works at a high level.
- What data is persisted locally and what should not be committed.

The root lockfile cleanup should be based on observed state. If the root `package-lock.json` is redundant and untracked, delete it. Do not touch `frontend/package-lock.json`.

## Validation

After documentation and cleanup:

- `git status --short` should not show the accidental root `package-lock.json`.
- `npm --prefix frontend run test:platform` should pass.
- `npm --prefix frontend run test:domain` should pass.
- `npm --prefix frontend exec tsc -- --noEmit` should pass.
- `npm --prefix frontend run build` should pass without the multiple-lockfile warning caused by the root lockfile.

## Success Criteria

- A new contributor can read `docs/CURRENT_MAP.md`, `ARCHITECTURE.md`, and `README.md` and understand the current backend-backed LexNet direction.
- Documentation no longer claims the project is only browser-local storage.
- The accidental root lockfile is gone if confirmed redundant.
- Verification remains green after docs-only cleanup.
