# LexNet — AI Agent Instructions

## Start Here

Read `docs/CURRENT_MAP.md` for project orientation. It lists all active source files, routes, state machine, and commands.

## Active Working Directories

- `frontend/src/app/` — Next.js routes
- `frontend/src/components/` — UI components
- `frontend/src/lib/` — domain logic (lexnet-*.ts files)
- `frontend/src/providers/` — Web3Provider
- `contracts/` — GenLayer Python contract

## Commands

```bash
cd frontend
npm run dev          # dev server :3002
npm run build        # production build
npm run test:domain  # domain tests
```

## Architecture

See `ARCHITECTURE.md` for the commerce trust architecture (LexNetCommerceCore contract, verification adapter, browser-local storage).

## What to Skip

- `genlayer-js/` — vendored SDK, reference only
- `docs/archive/` — old specs and roadmaps
- `.agent/`, `.shared/` — tooling
- `frontend/node_modules/` — dependencies
