Summary:
Updated `docs/CURRENT_MAP.md` only.

Changed files:
- `docs/CURRENT_MAP.md`

Facts synced:
- Updated map date to 2026-05-17.
- Added `frontend/src/lib/platform/observability.ts`.
- Added `frontend/src/lib/platform/passport-copy.ts`.
- Added `frontend/src/lib/platform/demo-seed.ts`.
- Added `/api/platform/status`.
- Clarified `/api/security/status` as public readiness status.
- Expanded platform layer summary to include demo/production auth, observability, and evidence policy.

Risks:
- Other working-tree changes already exist outside this task and were not touched.
- No tests run because this was a documentation-only constrained edit.

Next recommended task:
Run `git diff -- docs/CURRENT_MAP.md` and review the wording before committing.
