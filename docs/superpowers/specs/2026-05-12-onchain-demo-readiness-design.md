# On-chain Demo Readiness Design

## Goal

Make Phase 1 of the on-chain-focused demo smooth and honest: LexNet should always demo reliably with local verification while clearly showing GenLayer contract readiness, wallet/network/config status, and guarded on-chain execution boundaries.

## Scope

Phase 1 is contract-ready demo plus guarded execution. It does not implement direct GenLayer writes from the UI and does not add payable escrow. The app keeps local browser flows stable, labels remote execution honestly, and disables contract actions when configuration is incomplete.

## Design

### Contract readiness model

Add a small frontend readiness model in `frontend/src/lib/lexnet-contract.ts`. It derives readiness from public env config and optional wallet/network signals:

- contract address configured
- RPC URL configured
- network label available
- wallet connected
- all requirements satisfied
- human-readable blocking reasons

This model is deterministic and side-effect free so it can be displayed in dashboard/case pages and tested without a live network.

### Demo UI

Add a reusable `ContractReadinessPanel` component. It shows:

- current execution mode: local verification or contract configured/local fallback
- configured contract address, RPC, and network label
- wallet status when supplied by Wagmi
- readiness checklist and blocking reasons
- a guarded button label that explains on-chain execution is prepared but not enabled in Phase 1

The dashboard and case detail page should include this panel so presenters can explain the on-chain path without risking demo failure.

### Guarded execution

The case detail verification button remains local and reliable. Add a secondary guarded contract action that is disabled unless readiness is complete. Even when readiness is complete, Phase 1 should present a clear message that direct GenLayer writes are Phase 3, and local verification remains the active demo execution path.

### Testing

Add domain-level tests for readiness derivation:

- no contract address means local fallback with a blocking reason
- contract configured without wallet means contract config is present but wallet is blocking execution
- contract configured with wallet means ready for guarded execution

Run domain tests, TypeScript, and production build.

## Success Criteria

- Demo flow remains smooth with local case creation, evidence, verification, and passports.
- UI clearly shows contract/RPC/network/wallet readiness.
- No button implies on-chain execution has happened when it has not.
- Tests, typecheck, and build pass.
