# LexNet

LexNet is an AI-verified commerce trust platform for agreements, delivery evidence, AI verification, settlement recommendations, and portable trust history.

The current MVP is recommendation-only. It does not custody funds, execute payouts, or move real value.

## Core loop

Create commerce case → Submit delivery evidence → Run AI verification → Produce settlement recommendation → Update trust passport.

## Active architecture

- **Contract:** `contracts/lexnet_commerce_core.py` defines the commerce case, evidence, verification, recommendation, and trust-passport boundary for GenLayer.
- **Frontend:** `frontend/src/app/` uses the Next.js App Router for the active product routes.
- **Domain logic:** `frontend/src/lib/` contains the LexNet commerce, verification, storage, and passport logic.
- **UI:** `frontend/src/components/` contains the case, evidence, verification, recommendation, and passport interface components.
- **Local state:** The MVP uses browser `localStorage` with seed cases for local evaluation and demos.
- **Verification adapter:** The active adapter is deterministic and local today, with the GenLayer boundary prepared for future network-backed verification.

## Routes

- `/` — commerce trust dashboard
- `/cases/new` — create a commerce case
- `/cases/[id]` — review a case, submit evidence, run verification, and view recommendations
- `/passports` — view portable trust history

## Commands

```bash
cd frontend
npm install
npm run dev
npm run test:domain
npm run build
```

## Environment variables

```bash
NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS=
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

## Production boundary

Do not use LexNet to move real funds until payable escrow, settlement transfer paths, dispute appeals, evidence storage policy, lifecycle tests, and security review are complete.

## License

See repository and subfolders for license information.
