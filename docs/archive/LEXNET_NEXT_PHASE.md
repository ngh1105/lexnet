# LexNet Next Development Phase

Last updated: 2026-05-11

## Current Baseline

LexNet has a completed demo/backend-mode baseline. The app can persist demo data to `frontend/.lexnet-data/store.json`, generate demo account metadata with `genlayer-js`, display evidence and audit trails, export verification reports, publish trust passports, and run platform validation tests.

## Non-Production Boundaries

- The filesystem JSON store is for demo persistence only.
- Demo account generation stores only address and `privateKeyRef` metadata; raw private keys must not be persisted.
- Report print export is printable HTML, not a binary PDF generator.
- Auth/RBAC routes model workflow state, but do not yet enforce production identity sessions.
- Payment readiness exposes feature flags and safety metadata; it is not a live payment launch.

## Recommended Build Order

1. Review and harden the demo baseline.
2. Replace filesystem storage with a production database and migrations.
3. Add real authentication, session handling, and RBAC enforcement.
4. Run live GenLayer testnet flows with safe test accounts.
5. Add production monitoring, backups, incident handling, and PDF generation.

## Definition of Done for the Next Phase

- All existing tests pass.
- Store migration tests prove older demo stores remain readable.
- No raw private keys are persisted to repository files or `.lexnet-data/store.json`.
- Roadmap priorities are encoded in `frontend/src/lib/platform/roadmap.ts` and tested.
- `tasks/PROGRESS_LOG.md` points to this next-phase roadmap without reopening completed demo tasks.
