# LexNet Commerce Trust Polish Spec

## Summary

Four-track improvement pass on the freshly migrated commerce trust platform: tests, cleanup, Web3 wiring, and UI refactoring.

## Track 1: Domain Tests

Create `frontend/tests/` with unit tests for the pure domain layer:

- `lexnet-domain.test.ts` — normalizeEvidenceUrls, createCommerceCase, appendEvidenceToCase, buildCommerceCaseStats, buildTrustPassports, getStatusForVerdict, buildChecksum
- `lexnet-verification.test.ts` — buildLocalVerificationReport (score ranges, verdict thresholds, risk flags), adapter interface
- `lexnet-client-store.test.ts` — getMergedCommerceCases, createStoredCommerceCase, submitStoredEvidence, verifyStoredCommerceCase, isCommerceCase guard

Uses `tsx --test` (Node built-in test runner). No external test framework.

## Track 2: Cleanup

- Update `ARCHITECTURE.md` to reflect `LexNetCommerceCore` contract and commerce trust flow
- Fix `Dockerfile` to remove references to deleted `platform/`, `drizzle/`, `schema.ts`
- Remove dead deps from `package.json`: `@phosphor-icons/react`, `framer-motion`
- Update `.env.example` to match current env vars
- Remove stale `tests/test_escrow_lifecycle.py` (tests old contract)
- Update `docs/project-structure.md` if it exists

## Track 3: Web3 Wiring

- Replace static "Wallet Ready" button in Sidebar with RainbowKit `ConnectButton`
- Import and use `genlayer-js` in `lexnet-contract.ts` to implement real contract reads
- Implement `createContractVerificationAdapter()` to call `verify_case()` on the deployed contract
- Add contract write helpers: `createCaseOnChain()`, `submitEvidenceOnChain()` in service layer
- Wire wallet account to case creation (buyer = connected address)

## Track 4: UI Refactor

- Extract shared primitives to `components/ui/`: `Metric.tsx`, `Panel.tsx`, `StatusChip.tsx`
- Replace inline styles with existing CSS classes from `globals.css`
- Fix dashboard inspector to track user-selected case (not always first)
- Fix NewCaseForm to receive seedCases prop
- Add React error boundary wrapper in layout
- Add loading skeletons for case detail page
