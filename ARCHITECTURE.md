# LexNet — System Architecture

> **Protocol:** GenLayer (AI-Native Trust Layer)
> **Contract:** Python (GenVM)
> **Updated:** 2026-05-12

## Overview

LexNet is an AI-verified commerce trust platform. It turns commercial agreements into verifiable case files, uses GenLayer AI consensus to evaluate delivery, and produces portable trust passports.

## Architecture Layers

```
Premium audit-desk UI (Next.js)
  → LexNet browser store (localStorage)
  → LexNet domain/service layer (pure functions)
  → Verification adapter (local deterministic / GenLayer contract)
  → LexNetCommerceCore Intelligent Contract
  → GenLayer consensus
```

## Contract: LexNetCommerceCore

Located at `contracts/lexnet_commerce_core.py`. Recommendation-only — does not custody or transfer funds.

### State Machine

```
DRAFT → ACTIVE → EVIDENCE_SUBMITTED → UNDER_AI_REVIEW → VERIFIED
                                                   ├→ REVISION_REQUESTED
                                                   ├→ DISPUTED
                                                   └→ SETTLEMENT_RECOMMENDED
```

### Key Methods

- `create_case(title, seller, agreement_text, acceptance_criteria_json, amount_reference)` — buyer creates case
- `submit_evidence(case_id, evidence_json)` — seller submits delivery URLs (max 8, http only)
- `verify_case(case_id)` — triggers AI consensus (leader/validator via `run_nondet_unsafe`)
- `get_case(case_id)` / `list_case_ids()` — read methods

### AI Consensus

Leader produces verdict JSON. Validator independently runs same evaluation. Consensus requires matching verdict and score within 10 points.

### Verification Output

```json
{
  "verdict": "APPROVE|REVISE|REJECT|SPLIT_RECOMMENDED",
  "score": 0-100,
  "summary": "...",
  "recommendation": "...",
  "seller_share_bps": 0-10000,
  "reviewed_at": "block_number"
}
```

## Frontend Architecture

### Domain Layer (`frontend/src/lib/lexnet-*.ts`)

- **types** — TypeScript interfaces for cases, evidence, reports, passports
- **domain** — pure functions: create case, append evidence, build stats, compute trust passports
- **verification** — `VerificationAdapter` interface with local deterministic + contract facade
- **contract** — reads env vars, selects adapter (contract if address configured, local fallback)
- **service** — seed cases + runtime mode detection
- **client-store** — localStorage persistence, merges seed + user cases

### Routes

| Path | Purpose |
|------|---------|
| `/` | Trust Case Queue dashboard |
| `/cases/new` | New commerce case intake |
| `/cases/[id]` | Case detail, evidence, verify |
| `/passports` | Trust passport records |

### Storage

Browser localStorage. Seed cases (3 hardcoded) merged with user-created cases. Contract adapter ready for GenLayer deployment.

## Production Boundary

LexNet should not move real funds until:
- Payable escrow contract
- Settlement transfer paths
- Dispute appeal path
- Evidence storage policy
- Security review
- Lifecycle tests against Studionet
