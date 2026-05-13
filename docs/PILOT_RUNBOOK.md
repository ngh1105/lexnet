# LexNet Pilot Runbook

LexNet pilot mode is for controlled operator demos and early pilot workflows. It keeps local filesystem persistence and demo-private authorization, while reporting the production blockers that must be resolved before real commerce use.

LexNet is recommendation-only in local demo and pilot operation. It provides no custody, no payouts, no real value movement, and no settlement finality from local verification or GenLayer submission alone.

## Local Pilot Setup

From the repository or worktree root:

```bash
npm --prefix frontend install
npm --prefix frontend run pilot:prepare
npm --prefix frontend run demo:dev
```

The dev server prefers `http://localhost:3002` and falls back to `http://localhost:3003` when using `demo:dev`.

## Environment Checklist

```bash
LEXNET_RUNTIME_MODE=pilot
LEXNET_ENABLE_DEMO_PRIVATE_API=true
LEXNET_DEMO_PRIVATE_API_TOKEN=
LEXNET_PRODUCTION_AUTH_PROVIDER=
LEXNET_PRODUCTION_AUTH_MODE=off
LEXNET_PRODUCTION_AUTH_SECRET=
LEXNET_PRODUCTION_AUTH_CLOCK_SKEW_SECONDS=300
LEXNET_MANAGED_DATABASE_URL=
LEXNET_MANAGED_PERSISTENCE_PROVIDER=
LEXNET_EVIDENCE_RETENTION_POLICY=
NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS=
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_GENLAYER_NETWORK_LABEL=Studionet
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

Pilot mode may use filesystem persistence and demo-private auth. Production mode must configure enforced production auth, managed persistence, and evidence retention policy before mutating routes are allowed.

## Seed, Reset, Backup, and Restore

```bash
npm --prefix frontend run pilot:prepare
npm --prefix frontend run demo:backup
npm --prefix frontend run demo:restore -- <backup-path>
npm --prefix frontend run demo:reset
```

`pilot:prepare` resets and reseeds `.lexnet-data/store.json`. It refuses to run when `LEXNET_RUNTIME_MODE=production`.

Use `demo:backup` before destructive resets when you need a local snapshot. Backups remain local under `.lexnet-data/` and must not be committed.

## Trusted-Header Auth Boundary

Future staging gateways can use trusted-header mode by deriving operator context at the edge and signing the operator id, timestamp, and nonce with HMAC. LexNet verifies the signature and clock skew before accepting production mutations. Keep the signing secret only in the gateway/app environment; do not commit it or include real values in runbooks.

Phase E hardens the production backbone for auth/readiness/policy checks. It is not a deploy, payment, custody, payout, or settlement-transfer milestone.

## GenLayer Proof Workflow

1. Configure `NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS` and `NEXT_PUBLIC_GENLAYER_RPC_URL`.
2. Open a case detail page.
3. Submit `verify_case` from the GenLayer Execution Proof panel.
4. Treat the transaction hash as submission evidence only.
5. Use Check contract state to read `get_case(case_id)`.
6. LexNet marks a proof as contract-state verified only when contract state contains `verification_report`.

LexNet does not custody funds, execute payouts, move real value, or claim settlement finality. A GenLayer submission alone is not settlement finality, and local verification is not settlement finality.

## Readiness Check Commands

```bash
npm --prefix frontend run pilot:check
npm --prefix frontend run test:platform
npm --prefix frontend run test:domain
npm --prefix frontend exec tsc -- --noEmit
npm --prefix frontend run build
```

`pilot:check` exits non-zero for production-mode blockers or forbidden secret-like keys in the local store. Local-demo and pilot readiness warnings do not fail the command.

## Known Production Blockers

- Production auth requires an enforced trusted-header boundary and operational gateway review.
- Managed persistence is not selected or provisioned; no real managed DB adapter is implemented yet.
- Evidence retention policy must be configured.
- Managed backup, monitoring, and disaster recovery are not configured.
- GenLayer execution needs audited production operations.
- Payment custody and settlement transfer paths are out of scope.

## Forbidden Claims and Data-Handling Boundaries

Do not claim settled, paid, funds released, escrow completed, or final on-chain settlement from local verification or GenLayer submission alone.

Do not claim LexNet custody, payouts, real value movement, production settlement, payment release, or dispute finality unless those paths are explicitly designed, implemented, audited, and verified in a production environment.

Do not store private keys, seed phrases, mnemonics, wallet secrets, or raw evidence payloads in `.lexnet-data/store.json`.

Public passports must remain privacy-safe and must not expose raw parties, evidence URLs, case IDs, audit events, operators, workspace memberships, or unpublished passport records.
