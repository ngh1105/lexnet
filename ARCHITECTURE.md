# LexNet — System Architecture

> **Protocol:** GenLayer (AI-Native Trust Layer)
> **Contract:** Python (GenVM)
> **Updated:** 2026-05-12

## Overview

LexNet is an AI-verified commerce trust platform. It turns commercial agreements into verifiable case files, evaluates delivery evidence, produces settlement recommendations, and publishes privacy-safe trust passports.

The current product foundation is backend-backed for demo/pilot workflows, but it remains recommendation-only. It does not custody funds, execute payouts, or fake on-chain settlement.

## Architecture Layers

```text
Next.js App Router UI
  → Platform API routes and server-rendered pages
  → Platform backend layer (.lexnet-data/store.json)
  → LexNet domain/service layer (pure commerce logic + safe fallbacks)
  → Verification adapter (local deterministic / GenLayer-ready facade)
  → LexNetCommerceCore Intelligent Contract boundary
  → GenLayer consensus when real network integration is configured
```

## Contract: LexNetCommerceCore

Located at `contracts/lexnet_commerce_core.py`. The contract models commerce cases, evidence, AI verification, and recommendation output. It is recommendation-only and does not custody or transfer funds.

### State Machine

```text
DRAFT → ACTIVE → EVIDENCE_SUBMITTED → UNDER_AI_REVIEW → VERIFIED
                                                   ├→ REVISION_REQUESTED
                                                   ├→ DISPUTED
                                                   └→ SETTLEMENT_RECOMMENDED
```

### Key Methods

- `create_case(title, seller, agreement_text, acceptance_criteria_json, amount_reference)` — buyer creates a case.
- `submit_evidence(case_id, evidence_json)` — seller submits delivery URLs.
- `verify_case(case_id)` — triggers AI verification at the contract boundary.
- `get_case(case_id)` / `list_case_ids()` — read methods.

### Verification Output

```json
{
  "verdict": "APPROVE|REVISE|REJECT|SPLIT_RECOMMENDED",
  "score": 0,
  "summary": "...",
  "recommendation": "...",
  "seller_share_bps": 0,
  "reviewed_at": "block_number"
}
```

## Frontend Domain Layer

The domain layer lives under `frontend/src/lib/lexnet-*.ts`.

- `lexnet-types.ts` defines commerce case, evidence, report, and passport types.
- `lexnet-domain.ts` contains pure functions for case creation, evidence packs, stats, timelines, and trust passport scoring.
- `lexnet-verification.ts` defines verification adapters and deterministic scoring.
- `lexnet-contract.ts` reads public env config, exposes guarded GenLayer payload previews, and builds verify-case execution plans.
- `genlayer-client.ts` isolates `genlayer-js` client usage behind a small adapter so application code does not depend on SDK internals directly.
- `lexnet-service.ts` provides seed cases, runtime mode, and backend-aware case loading.
- `lexnet-client-store.ts` preserves browser localStorage fallback/cache behavior for local demo cases.

## Platform Backend Layer

The platform layer lives under `frontend/src/lib/platform/`.

- `types.ts` defines backend records: workspace, operator, membership, queue item, published passport, audit event, and platform summary.
- `store.ts` manages `.lexnet-data/store.json`, safe initialization, validation, serialized mutations, dashboard DTOs, passport DTOs, and audit append behavior.
- `passports.ts` generates private passport records, derives stable subject keys, builds privacy-safe public passport views, and hides unpublished passports.
- `api.ts` centralizes JSON responses, request parsing, security status, and lightweight rate limiting.
- `backup.ts` creates and restores local `.lexnet-data/store.json` snapshots.
- `auth.ts` implements demo-private operator authorization using `LEXNET_ENABLE_DEMO_PRIVATE_API=true`, `x-lexnet-operator-id: operator-demo`, and optional bearer-token hardening.

The filesystem store is the backend source of truth for platform mode. Browser localStorage is not the platform source of truth; it remains a local fallback/cache for demo-created browser state.

## Routes

| Path | Purpose |
|------|---------|
| `/` | Backend-aware trust dashboard with platform summary and operator queue |
| `/cases/new` | New commerce case intake |
| `/cases/[id]` | Case detail, evidence, verification, and recommendations |
| `/passports` | Operator trust passport records and publishing controls |
| `/passport/[slug]` | Public privacy-safe trust passport page |

## API Routes

| Path | Access | Purpose |
|------|--------|---------|
| `/api/workspaces` | Demo-private | Workspace and membership summary |
| `/api/operators` | Demo-private | Operator summary |
| `/api/queue` | Demo-private | Review queue summary |
| `/api/passports` | Demo-private | Generate passport records and toggle publishing |
| `/api/passports/public/[slug]` | Public | Privacy-safe public passport JSON |
| `/api/admin/backup` | Demo-private | Backup/export summary with audit event |
| `/api/genlayer/verify-case` | Demo-private | Guarded `genlayer-js` write endpoint for `verify_case` |
| `/api/security/status` | Public status | Environment and platform readiness summary |

## Public Passport Privacy Boundary

Public passport views include only privacy-safe aggregate fields:

- Redacted subject.
- Role.
- Trust level.
- Average score.
- Verified/total case counts.
- Referenced value band.
- Risk labels.
- Published and updated timestamps.
- Public slug.

Public views do not expose raw wallet addresses, raw party identifiers, evidence URLs, case IDs, audit events, operator records, workspace memberships, or unpublished passport records.

## GenLayer Boundary

The UI may show contract readiness, blocking reasons, and guarded payload previews. `genlayer-js` is used only through `frontend/src/lib/genlayer-client.ts`, which maps LexNet `verify_case` intent to the SDK's contract write shape.

The guarded SDK endpoint can submit a real `verify_case` call only when demo-private authorization and contract readiness pass. GenLayer execution records are stored separately from local verification reports: `submitted` means the SDK call returned, while `state_verified` means contract `get_case` returned a verification report. It does not custody funds, does not store private keys, and does not claim settlement finality unless a later contract-state verification proves it.

## Demo Hardening Boundary

The demo hardening layer improves local pilot operation without claiming production readiness. `demo:dev` avoids port collisions, `demo:backup` and `demo:restore` manage local filesystem snapshots, and demo-private APIs may require an optional bearer token.

These controls do not replace production authentication, managed database storage, monitored backups, evidence retention policy, or audited GenLayer transaction execution.

## Production Boundary

Before using LexNet for production commerce workflows, add and review:

- Durable database storage or managed persistence.
- Production authentication and authorization.
- Evidence storage policy.
- Real GenLayer network integration tests.
- Deployment and backup operations.
- Security review for all mutating routes.
- Payment/settlement implementation only if the product scope explicitly adds custody or transfer paths.
