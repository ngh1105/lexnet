# LexNet Current Project Map

> Last updated: 2026-05-12

## What is LexNet

AI-verified commerce trust platform. Buyers and sellers attach evidence to commerce cases, GenLayer evaluates delivery against agreements, LexNet produces consensus-backed verification reports and trust passports.

## Active Source Files

### Contract
- `contracts/lexnet_commerce_core.py` — GenLayer Intelligent Contract, recommendation-only (no fund custody)

### Frontend Domain Logic
- `frontend/src/lib/lexnet-types.ts` — type definitions
- `frontend/src/lib/lexnet-domain.ts` — pure functions (no side effects)
- `frontend/src/lib/lexnet-verification.ts` — scoring + adapter interface
- `frontend/src/lib/lexnet-contract.ts` — environment config + adapter factory
- `frontend/src/lib/lexnet-service.ts` — seed data + runtime mode
- `frontend/src/lib/lexnet-client-store.ts` — localStorage persistence

### Frontend Components
- `frontend/src/components/CommerceDashboardClient.tsx`
- `frontend/src/components/CaseDetailClient.tsx`
- `frontend/src/components/NewCaseForm.tsx`
- `frontend/src/components/TrustPassportsClient.tsx`
- `frontend/src/components/Sidebar.tsx`

### Frontend Routes
- `/` — dashboard (Trust Case Queue)
- `/cases/new` — new case intake
- `/cases/[id]` — case detail + evidence + verify
- `/passports` — trust passport records

### Other Active Files
- `frontend/src/app/layout.tsx` — root layout + Web3Provider
- `frontend/src/app/globals.css` — premium audit-desk styling
- `frontend/src/providers/Web3Provider.tsx` — RainbowKit + Wagmi
- `frontend/package.json` — dependencies and scripts
- `frontend/tests/lexnet-domain.test.ts` — active domain tests

## Commands

```bash
cd frontend
npm run dev          # dev server :3002
npm run build        # production build
npm run test:domain  # domain tests
```

## Case State Machine

```
DRAFT → ACTIVE → EVIDENCE_SUBMITTED → UNDER_AI_REVIEW → VERIFIED
                                                   ├→ REVISION_REQUESTED
                                                   ├→ DISPUTED
                                                   └→ SETTLEMENT_RECOMMENDED
```

## Verification Verdicts

`APPROVE` | `REVISE` | `REJECT` | `SPLIT_RECOMMENDED`

## Storage Model

Browser localStorage. Seed cases merged with user-created cases. Contract facade ready for GenLayer deployment.

## Deprecated / Do Not Read

- `docs/archive/` — old specs and roadmaps
- `genlayer-js/` — vendored SDK, not active source
- `.agent/`, `.shared/` — tooling, not project code
- `docs/archive/test_escrow_lifecycle.py` — archived old escrow contract test
