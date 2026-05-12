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
- `lexnet-contract.ts` reads public env config and exposes guarded GenLayer payload previews.
- `lexnet-service.ts` provides seed cases, runtime mode, and backend-aware case loading.
- `lexnet-client-store.ts` preserves browser localStorage fallback/cache behavior for local demo cases.

## Platform Backend Layer

The platform layer lives under `frontend/src/lib/platform/`.

- `types.ts` defines backend records: workspace, operator, membership, queue item, published passport, audit event, and platform summary.
- `store.ts` manages `.lexnet-data/store.json`, safe initialization, validation, serialized mutations, dashboard DTOs, passport DTOs, and audit append behavior.
- `passports.ts` generates private passport records, derives stable subject keys, builds privacy-safe public passport views, and hides unpublished passports.
- `api.ts` centralizes JSON responses, request parsing, security status, and lightweight rate limiting.
- `auth.ts` implements demo-private operator authorization using `LEXNET_ENABLE_DEMO_PRIVATE_API=true` and `x-lexnet-operator-id: operator-demo`.

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

The UI may show contract readiness, blocking reasons, and guarded payload previews. It must not claim live on-chain execution unless a real network integration proves it. The current MVP remains recommendation-only and safe for demos.

## Production Boundary

Before using LexNet for production commerce workflows, add and review:

- Durable database storage or managed persistence.
- Production authentication and authorization.
- Evidence storage policy.
- Real GenLayer network integration tests.
- Deployment and backup operations.
- Security review for all mutating routes.
- Payment/settlement implementation only if the product scope explicitly adds custody or transfer paths.
