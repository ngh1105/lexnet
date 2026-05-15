# LexNet Frontend

Next.js App Router frontend for the LexNet commerce trust demo. It covers case intake, evidence review, AI verification recommendations, operator queueing, GenLayer proof boundaries, platform readiness, and privacy-safe public trust passports.

LexNet is recommendation-only in this MVP. It does not custody funds, execute payouts, move real value, or claim settlement finality from local verification or GenLayer submission alone.

## Run Locally

```bash
npm install
npm run demo:seed
npm run dev
```

Open `http://localhost:3002`.

For the packaged demo flow, run:

```bash
npm run demo:seed
npm run demo:dev
```

`demo:dev` prefers port `3002` and falls back to `3003` when another checkout is already running.

## Main Routes

- `/` - command-center dashboard.
- `/cases/new` - create a commerce case.
- `/cases/[id]` - evidence, verification, recommendation, and GenLayer proof view.
- `/passports` - operator trust passport records and publish/unpublish controls.
- `/passport/[slug]` - public privacy-safe passport.
- `/platform` - redacted readiness and observability view.

## Verification

```bash
npm run test:domain
npm run test:platform
npm run build
npm run pilot:check
```

Or run the combined MVP check:

```bash
npm run verify:mvp
```

## Environment

Copy `.env.example` to `.env.local` for local configuration. Keep `.env.local`, generated private keys, and `.lexnet-data/` out of git.

The demo-private APIs require `x-lexnet-operator-id: operator-demo`. If `LEXNET_DEMO_PRIVATE_API_TOKEN` is set, include `Authorization: Bearer <token>` as well.

## GenLayer Boundary

`genlayer-js` is used through the local adapter only. A transaction hash is treated as submission evidence; LexNet marks a case contract-state verified only after reading contract state and finding the expected verification report.
