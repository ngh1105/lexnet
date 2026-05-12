# Testnet On-Chain Verification Script Design

Date: 2026-05-11

## Goal

Add a CLI script that verifies LexNet escrow contract connectivity and optional write flow against GenLayer studionet, using `genlayer-js` SDK with ephemeral demo accounts.

## Architecture

Two modes controlled by `--write` flag:
- **Default (dry-run):** validate env, create ephemeral account, ping RPC, read `get_treasury` from contract.
- **With `--write`:** also call `create_escrow`, wait for receipt, report tx hash and status.

Script outputs structured JSON to stdout. Never outputs private keys.

## Files

- `frontend/scripts/verify-testnet-account.mjs` — main script
- `frontend/src/lib/platform/testnet-script.test.mjs` — tests (updated)
- `frontend/package.json` — add `verify:testnet-account` script

## Data Flow

1. Read `NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS` and `NEXT_PUBLIC_GENLAYER_RPC_URL` from env.
2. Create ephemeral account via `createAccount()`.
3. Create GenLayer client via `createClient({ endpoint, chain: studionet, account })`.
4. Dry-run: call `readContract(get_treasury)`. Output `{ mode, contractAddress, rpcUrl, demoAccount: { address, privateKeyRef }, treasury, reachable }`.
5. With `--write`: call `writeContract(create_escrow, [freelancerAddress, requirementsText])`, `waitForTransactionReceipt`, output additional `{ txHash, txStatus, createdEscrowId }`.

## Error Handling

- Missing env vars: exit 1 with JSON `{ error: "...", missing: [...] }`.
- RPC unreachable: `{ reachable: false, error: "..." }`.
- Contract read fail: `{ reachable: true, contractReadFailed: true, error: "..." }`.
- Write fail: `{ txAttempted: true, success: false, error: "..." }`.

## Testing

- Test dry-run: script exits 0, JSON has `mode`, `contractAddress`, `reachable`, no `privateKey`.
- Test missing env: script exits non-zero with error JSON.
- Test `--write` guard: without contract address env, `--write` still fails cleanly.
