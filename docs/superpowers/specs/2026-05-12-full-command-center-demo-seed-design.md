# Full Command-Center Demo Seed Design

## Goal

Create a deterministic demo seed flow that writes realistic LexNet platform data to `.lexnet-data/store.json` so the current backend-backed product opens with a complete commercial demo story instead of sparse fallback data.

## Current State

The Production Backbone is complete: platform records persist through `frontend/src/lib/platform/store.ts`, backend dashboard data reads from `.lexnet-data/store.json`, demo-private APIs are guarded, public passports are privacy-safe, and verification commands pass.

The frontend still relies on in-code seed cases when the backend store is missing or unavailable. That fallback is useful for resilience, but it is not enough for a polished demo because it does not persist a full command-center story with review queue, audit trail, multiple operators, and public passport publishing state.

## Scope

In scope:

- Add a local demo seed script that creates `.lexnet-data/store.json` through existing domain/platform helpers.
- Add a local demo reset script or command path that removes only `.lexnet-data/store.json`.
- Add frontend package scripts for seeding and resetting demo data.
- Seed a full command-center story with commerce cases, evidence, verification reports, workspace/operator data, memberships, queue items, published passports, and audit events.
- Add platform tests that validate the seeded store shape, key counts, public passport availability, audit coverage, and absence of private keys/secrets.
- Update README/CURRENT_MAP only where needed to document the new demo commands.

Out of scope:

- Production authentication or OAuth.
- Managed database migration.
- Real GenLayer transaction execution.
- Private key generation, storage, or account funding.
- Committing `.lexnet-data/store.json`.
- Editing `genlayer-js`.

## Design

Use a script-driven deterministic seed, not hand-written JSON. The script should construct data using existing LexNet domain/platform helpers so the generated store follows the same shapes as runtime data.

The seed should live under `frontend/scripts/` and be callable from the repository/worktree root with:

```bash
npm --prefix frontend run demo:seed
npm --prefix frontend run demo:reset
```

`demo:seed` should create or overwrite `.lexnet-data/store.json` with a complete store. This is acceptable because the command is explicitly a local demo reset/seed operation. `demo:reset` should remove only `.lexnet-data/store.json` and leave `.lexnet-data/` itself safe to recreate.

The seeded story should represent a full command-center demo:

- One primary workspace, such as `LexNet Pilot Command Center`.
- At least two operators, including `operator-demo`, with non-secret demo wallet addresses and roles.
- Five to seven commerce cases with realistic commercial titles and agreement text.
- Case statuses spread across active intake, evidence submitted, under review, verified, revision requested or disputed, and split settlement recommended.
- Evidence generated through `buildEvidencePack()` from safe public/demo URLs.
- Verification reports with deterministic verdicts, scores, seller-share basis points, recommendations, reviewed timestamps, risk flags where appropriate, and `source: "local"`.
- Queue items for cases that need review or follow-up, using safe priorities and operator assignments.
- Published passport records generated with `buildPublishedPassports()` from the seeded cases, with at least one published buyer passport and one published seller passport.
- Audit events that match the seeded lifecycle: case creation, evidence submission, verification generation, passport generation, and passport publishing.

The seed must not create fake on-chain results. Any verification report is local/demo verification, and any settlement output is a recommendation only. The seed must not contain private keys, mnemonics, API tokens, `.env.local` values, or generated secrets.

## Data Boundaries

Safe to seed:

- Demo wallet-like public addresses.
- Public/demo evidence URLs.
- Deterministic timestamps.
- Local verification reports and recommendations.
- Public passport slugs/aggregate fields.

Not safe to seed:

- Private keys or mnemonics.
- Real customer identities.
- API tokens or service credentials.
- Claims that funds moved or an on-chain settlement succeeded.

## Validation

After implementation:

- `npm --prefix frontend run demo:seed` should create `.lexnet-data/store.json`.
- `npm --prefix frontend run demo:reset` should remove `.lexnet-data/store.json` and not remove unrelated files.
- `npm --prefix frontend run test:platform` should pass and include seed validation tests.
- `npm --prefix frontend run test:domain` should pass.
- `npm --prefix frontend exec tsc -- --noEmit` should pass.
- `npm --prefix frontend run build` should pass.
- `git status --short` should not include `.lexnet-data/store.json` as a tracked or staged file.

## Success Criteria

- A local demo can be reset and reseeded with one command.
- The dashboard opens with realistic backend-backed metrics, queue items, cases, passports, and audit history.
- At least one public passport URL is available after seeding.
- Seeded data is deterministic and testable.
- No private keys, secrets, or fake on-chain execution claims are introduced.
