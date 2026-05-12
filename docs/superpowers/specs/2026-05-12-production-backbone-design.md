# Production Backbone Phase Design

## Goal

Move LexNet from a browser-local demo into a backend-backed product foundation that can support serious demos, pilot workflows, and later production hardening without faking on-chain behavior.

## Current State

LexNet is now aligned around the AI-verified commerce trust direction. The active app supports commerce cases, evidence submission, local verification, settlement recommendations, GenLayer readiness previews, and trust passport summaries. The strongest remaining gap is not UI polish; it is the lack of durable backend state and platform workflow primitives.

Current source of truth is still mostly browser `localStorage` plus seed cases. That is acceptable for a local MVP, but too weak for commercial demos because reports, evidence, trust passports, operators, and review state are not durable or shareable across users.

## Scope

This phase adds a minimal production backbone while preserving the existing demo flow.

In scope:

- Server-side persistence for commerce cases, evidence, verification reports, passports, operators, workspaces, review queue items, and audit events.
- Workspace/operator/review queue primitives that make the app feel like a real trust operations platform.
- Public trust passport publishing with privacy-safe redaction.
- Audit-friendly operational metadata.
- Backup/export support for the backend store.
- Environment validation, shared API helpers, and lightweight rate limiting for mutating routes.
- UI additions that expose backend mode, review queue state, and public passport publishing without redesigning the full app.

Out of scope:

- Real payment custody or escrow settlement.
- Fake on-chain success states.
- Full production OAuth or enterprise identity.
- Database migration complexity beyond a DB-ready store boundary.
- Deep changes to vendored `genlayer-js`.

## Architecture

Keep the current Next.js App Router architecture and add a focused platform layer under `frontend/src/lib/platform/`.

Core modules:

- `frontend/src/lib/platform/types.ts` defines backend records: workspace, operator, membership, queue item, published passport, audit event, and platform store.
- `frontend/src/lib/platform/store.ts` manages `.lexnet-data/store.json`, default seeding, read/write helpers, mutation helpers, and audit event append.
- `frontend/src/lib/platform/passports.ts` derives private and public passport views from verified commerce history.
- `frontend/src/lib/platform/auth.ts` provides minimal demo operator/session helpers. It should not pretend to be production OAuth.
- `frontend/src/lib/platform/api.ts` centralizes JSON responses, input parsing, environment validation, and rate-limit checks for API routes.

API routes should live under `frontend/src/app/api/` and follow a shared read/mutate/audit/write pattern:

- `/api/workspaces`
- `/api/operators`
- `/api/queue`
- `/api/passports`
- `/api/passports/public/[slug]`
- `/api/admin/backup`
- `/api/security/status`

The filesystem store is the source of truth for backend mode. Browser `localStorage` can remain as a local fallback/cache, but new backend-backed flows should read and write through API helpers.

## Data Flow

1. A commerce case is created or loaded from the backend store.
2. Evidence submission persists evidence server-side and appends an audit event.
3. Verification produces or stores a report against the case and appends an audit event.
4. Verified/resolved cases can generate trust passport records for buyers and sellers.
5. Operators can publish or unpublish a passport.
6. Publishing creates a stable public slug/token and stores a privacy-safe public view.
7. Public visitors can open `/passport/[slug]` and only receive redacted aggregate trust data.
8. Admin/operator views can inspect queue state, backend summary, security status, and backup/export metadata.

## Privacy and Security

Public passport responses must include only privacy-safe fields:

- Redacted subject identifier.
- Role.
- Trust level.
- Average score.
- Aggregate verified case counts.
- Aggregate referenced value bucket or rounded value.
- Source report count.
- Published timestamp.
- Non-sensitive risk labels.

Public passport responses must not include:

- Raw wallet/address identifiers unless redacted.
- Raw evidence URLs.
- Internal audit events.
- Operator notes.
- Private workspace membership data.
- Unpublished passport records.

Mutating routes should use shared helpers for:

- Method checks.
- JSON parsing.
- Required-field validation at API boundaries.
- Rate limiting.
- Audit event append.
- Consistent error responses.

The system must continue to avoid fake on-chain confirmations. GenLayer-related UI can show readiness, blocking reasons, and payload previews, but it must not claim a live transaction happened unless a real integration proves it.

## UI Impact

Keep the current Command Center UI and add only targeted backend indicators:

- Dashboard: backend summary card showing persisted cases, reports, passports, queue items, and audit events.
- Dashboard/right rail: review queue or operator assignment summary.
- Case detail: persisted report status and audit-backed evidence state.
- Passports page: publish/unpublish state and public link preview for generated passports.
- New public page: `/passport/[slug]`, rendering only privacy-safe public passport data.
- Admin/security card or route: environment and backup/export readiness.

## Testing and Verification

Add tests around the platform layer rather than only UI snapshots:

- Store initialization and read/write behavior.
- Audit event append behavior.
- Workspace/operator/queue record creation.
- Passport generation and public redaction.
- API helper error and rate-limit behavior.
- Existing domain tests remain passing.

Final verification for the phase:

- `npm run test:domain`
- Platform test command added during implementation.
- `tsc --noEmit`
- `npm run build`
- CodeRabbit review on committed changes.

## Success Criteria

The phase is complete when LexNet can demonstrate a backend-backed trust workflow:

- A case, evidence, verification report, passport, queue item, and audit trail persist in `.lexnet-data/store.json`.
- A trust passport can be generated and published.
- A public passport page can be opened by slug without exposing private evidence or internal records.
- Operator/workspace/queue summaries are visible in the app.
- Backup/export and security status are available.
- Tests, typecheck, build, and CodeRabbit committed review pass.
