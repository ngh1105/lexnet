Summary:
Read-only AppSec review completed. Main risk is that several operator-facing pages/API flows rely on “demo-private” assumptions but would expose platform data if deployed on a public host without stronger route/page authentication.

Findings by severity:
- High — Public pages expose private platform/case data without auth. `/`, `/cases/[id]`, `/passports`, and `/platform` server-render store-backed data with no authorization check: `frontend/src/app/page.tsx:8`, `frontend/src/app/cases/[id]/page.tsx:10`, `frontend/src/app/passports/page.tsx:7`, `frontend/src/app/platform/page.tsx:8`. Rendered data includes agreement text, buyer/seller identifiers, evidence URLs, queue signals, and draft/unpublished passport aggregates via `frontend/src/components/CaseDetailClient.tsx:241`, `frontend/src/components/CaseDetailClient.tsx:281`, `frontend/src/components/CaseDetailClient.tsx:330`, `frontend/src/lib/platform/store.ts:331`.
- High — Backup export is a GET endpoint that returns the full platform store shape behind weak demo-private auth in non-production. `frontend/src/app/api/admin/backup/route.ts:7` mutates audit state and returns `auditEvents`, `cases`, passports, and queue data at `frontend/src/app/api/admin/backup/route.ts:31`. In demo/private mode, the bearer token is optional: `frontend/src/lib/platform/auth.ts:36`.
- Medium — Production persistence readiness can overstate actual managed persistence. Readiness can mark managed persistence enforced, but the production repository path still returns the filesystem adapter when Postgres env vars are set: `frontend/src/lib/platform/store.ts:153`. Most routes call `readPlatformStore`/`mutatePlatformStore` directly, so they bypass the adapter boundary entirely.
- Medium — Production HMAC nonce replay protection is process-local only. `seenNonces` is an in-memory `Map` at `frontend/src/lib/platform/production-auth.ts:50`, so replay prevention does not hold across multiple server instances.
- Medium — Production auth enforcement does not require the configured provider in the actual request path. Readiness checks `LEXNET_PRODUCTION_AUTH_PROVIDER` in `frontend/src/lib/platform/production-auth.ts:159`, but `resolveProductionAuthContext` only enforces mode and secret at `frontend/src/lib/platform/production-auth.ts:199`.
- Medium — GenLayer API responses return raw SDK/contract data and execution records. `/api/genlayer/cases/[caseId]` returns `execution` and raw `result` at `frontend/src/app/api/genlayer/cases/[caseId]/route.ts:61`; `/api/genlayer/verify-case` returns raw SDK `result` at `frontend/src/app/api/genlayer/verify-case/route.ts:69`.
- Low — No CSP/security headers are configured. `frontend/next.config.ts:2` only sets standalone output, and no security headers were found.
- Low — Evidence URL policy is metadata-safe today but not SSRF-complete if future code fetches URLs server-side. It blocks obvious private/internal hosts at `frontend/src/lib/platform/evidence-policy.ts:118`, but it does not resolve DNS or enforce outbound network controls.

Data exposure risks:
- Public server-rendered routes are the largest exposure risk: raw case details and evidence URLs are visible without API auth.
- `/passports` loads all safe passport records, including unpublished/draft aggregates, from `getSafePassportRecords`: `frontend/src/app/passports/page.tsx:7`, `frontend/src/lib/platform/store.ts:342`.
- `/api/admin/backup` intentionally exports sensitive operational data and should not be exposed through optional-token demo auth.
- Public status endpoints avoid direct secrets but expose useful reconnaissance booleans such as token/auth/persistence readiness: `frontend/src/app/api/security/status/route.ts:3`, `frontend/src/app/api/platform/status/route.ts:7`.
- `frontend/.env.local` exists but was not opened; `git check-ignore` shows it is ignored, and `git ls-files` only showed `frontend/.env.example` tracked.

Auth/readiness risks:
- Demo-private auth is not sufficient for public deployments because `x-lexnet-operator-id: operator-demo` is predictable and the bearer token is optional.
- Production mutation auth is materially stronger due to HMAC body/path/query binding, timestamp checks, and timing-safe comparison, but provider enforcement and distributed nonce storage need tightening.
- Readiness claims around managed persistence should not say “managed” until routes actually use a managed adapter rather than filesystem helpers.
- Rate limiting is in-memory and operation-keyed, not user/IP/distributed; it does not protect all sensitive endpoints.

Recommended fixes:
- Add real authorization to operator pages (`/`, `/cases/*`, `/passports`, `/platform`) or explicitly block them outside local/demo mode.
- Make demo-private bearer token mandatory whenever the app is not bound to localhost; fail closed if `LEXNET_ENABLE_DEMO_PRIVATE_API=true` and `LEXNET_DEMO_PRIVATE_API_TOKEN` is empty.
- Change `/api/admin/backup` to `POST`, require production auth in production, add rate limiting, and return a minimal export manifest unless a privileged backup download flow is explicitly needed.
- Route all platform reads/writes through `createPlatformStoreRepository`; do not let production routes call filesystem helpers directly.
- Back production auth nonces with durable shared storage, or use a gateway-provided replay guarantee and document/enforce it.
- In `resolveProductionAuthContext`, require `LEXNET_PRODUCTION_AUTH_PROVIDER=trusted-header` in addition to mode and secret.
- Redact GenLayer route responses to known-safe fields; avoid returning raw SDK/contract payloads or untyped `verificationReport`.
- Add Next.js security headers, especially CSP, `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, and a restrictive `Referrer-Policy`.
- Keep evidence policy metadata-only unless outbound fetches are added; if fetching is added, enforce DNS/IP allowlists and network egress controls.

Verification commands:
```bash
npm --prefix frontend run test:platform
npm --prefix frontend run test:domain
npm --prefix frontend exec tsc -- -p frontend/tsconfig.json --noEmit
npm --prefix frontend run pilot:check
npm --prefix frontend audit --omit=dev
git ls-files -- frontend/.env.local .env .env.* frontend/.env frontend/.env.*
git check-ignore -v frontend/.env.local
```

Risks:
- Review was static/read-only; I did not start the app, call live endpoints, inspect `frontend/.env.local`, or run active security tests.
- Findings assume a public or shared deployment context; some issues are acceptable only for a strictly local demo.
