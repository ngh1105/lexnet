# LexNet Full Production Roadmap

Date: 2026-05-12

## Goal

Transform LexNet from demo/backend baseline to production-ready platform with SQLite database, session auth, live testnet UI, monitoring, and deploy pipeline.

## Architecture

- Database: SQLite via Drizzle ORM
- Auth: Server-side sessions stored in SQLite
- Frontend: Next.js 16 App Router (existing)
- Contract: GenLayer studionet (already deployed at `0x08a9897bbE5aEa24b41447f758FeD246035648B3`)
- Testnet: GenLayer SDK wallet integration

## Sub-projects

### P1: Hardening & Audit (4 tasks)
- P1.1: Audit API routes input validation
- P1.2: Rate limiting middleware for write endpoints
- P1.3: Security scan - no private key persist, no env leak
- P1.4: Edge case tests for migration, API errors, UI boundaries

### P2: Production Database - SQLite (5 tasks)
- P2.1: Setup Drizzle ORM + SQLite schema from PlatformStore types
- P2.2: Migration system (create/drop/seed)
- P2.3: Migrate JSON store data to SQLite (backward compatible)
- P2.4: Replace store.ts with Drizzle queries
- P2.5: Update all API routes to use Drizzle

### P3: Auth & RBAC (5 tasks)
- P3.1: Session table, login/logout API routes
- P3.2: Session middleware for API protection
- P3.3: Role-based access (admin/operator/viewer)
- P3.4: Login page UI + session indicator
- P3.5: Workspace membership enforcement

### P4: Live Testnet UI (5 tasks)
- P4.1: Wallet connect button (GenLayer account or MetaMask)
- P4.2: Contract mode escrow creation from browser
- P4.3: Fund escrow flow (amount, confirmation, receipt polling)
- P4.4: Submit work + evaluate from browser
- P4.5: Transaction status polling + real-time UI

### P5: Monitoring & PDF (5 tasks)
- P5.1: Structured logging for all API routes
- P5.2: Health check endpoint with DB/RPC/contract status
- P5.3: Admin dashboard metrics
- P5.4: PDF report generation
- P5.5: Alert rules for failures

### P6: Deploy Pipeline (4 tasks)
- P6.1: Dockerfile + docker-compose
- P6.2: Environment-based config (dev/staging/prod)
- P6.3: CI upgrade: lint, test, build, deploy
- P6.4: Staging deploy on Vercel or VPS

## Execution Order

P1 → P2 → (P3 + P4 + P5 parallel) → P6

## Tech Stack Additions

- `drizzle-orm` + `better-sqlite3` — database
- `iron-session` or custom cookie session — auth
- `pino` — structured logging
- `@react-pdf/renderer` or `puppeteer` — PDF generation
