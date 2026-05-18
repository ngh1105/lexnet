# Vercel Production Deploy Runbook

> Created 2026-05-18 after Postgres dispatch landed (commit `be5c8fc`).
> Postgres is required for production — Vercel filesystem is read-only.

---

## Phase 1 — Provision Postgres (manual, dashboard)

CLI does not support creating Vercel Postgres databases. Must use dashboard.

1. Open https://vercel.com/ngh1105s-projects/lexnet/storage
2. Click **Create Database** → **Neon Postgres** (Vercel partnered with Neon)
3. Region: pick closest (`iad1` US East / `sin1` Singapore / `hnd1` Tokyo)
4. Connect to Project: **lexnet** → Production environment
5. Click **Create**

After creation Vercel auto-sets these production env vars:
- `POSTGRES_URL` (pooled, use this for app)
- `POSTGRES_URL_NON_POOLING` (direct, for migrations)
- `POSTGRES_PRISMA_URL`, `POSTGRES_USER`, `POSTGRES_HOST`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`

---

## Phase 2 — Configure LexNet env vars

```bash
cd frontend

# Pull provisioned POSTGRES_* into local .env.production.local for migration
vercel env pull .env.production.local --environment=production

# Add LexNet runtime + persistence env vars
echo "production" | vercel env add LEXNET_RUNTIME_MODE production
echo "postgres"   | vercel env add LEXNET_MANAGED_PERSISTENCE_PROVIDER production

# Point LEXNET_MANAGED_DATABASE_URL at the non-pooling URL (migrations need direct connection)
# Read POSTGRES_URL_NON_POOLING from .env.production.local, then:
vercel env add LEXNET_MANAGED_DATABASE_URL production
# (paste the POSTGRES_URL_NON_POOLING value when prompted)

# HMAC secret for trusted-header production auth — generate 32+ random chars
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output, then:
vercel env add LEXNET_PRODUCTION_AUTH_SECRET production
echo "trusted-header" | vercel env add LEXNET_PRODUCTION_AUTH_PROVIDER production
echo "trusted-header" | vercel env add LEXNET_PRODUCTION_AUTH_MODE production
```

---

## Phase 3 — Run migration + import demo data

```bash
cd frontend

# Load env from .env.production.local for the local node process
# Windows PowerShell:
$env:LEXNET_MANAGED_DATABASE_URL=(Select-String -Path .env.production.local -Pattern '^POSTGRES_URL_NON_POOLING=' | %{ $_.Line.Split('=',2)[1].Trim('"') })
# Or bash:
export LEXNET_MANAGED_DATABASE_URL=$(grep '^POSTGRES_URL_NON_POOLING=' .env.production.local | cut -d= -f2- | tr -d '"')

# Create platform_store table
npm run postgres:migrate

# Seed demo data into postgres
npm run demo:seed       # writes to ../.lexnet-data/store.json
npm run postgres:import # reads that file, writes to postgres
```

Expected output:
```
Platform store schema ensured (table: platform_store).
Imported ../.lexnet-data/store.json into postgres (6 cases, 2 passports).
```

---

## Phase 4 — Deploy

```bash
cd frontend
vercel --prod
```

Watch the build log for:
- ✓ Compiled successfully
- ✓ TypeScript pass
- ✓ Static pages generated
- No "Managed persistence is required in production" errors

---

## Phase 5 — Smoke test

1. Open the deployed URL (e.g. `https://lexnet.vercel.app`)
2. Public passport view — no auth needed:
   `https://lexnet.vercel.app/passport/buyer-0x4f9a-lexnet-d86156e8`
   Should render trust passport with metrics.
3. `/login` page renders.
4. Connect MetaMask + submit verify_case (uses real Studionet contract).
5. Check `https://lexnet.vercel.app/api/security/status` — should return JSON with `runtimeMode: "production"` and `persistence.mode: "managed-configured"`.

---

## Rollback

If anything breaks in production:

```bash
# Roll back to previous deployment
vercel rollback

# Or unset the persistence env to fail closed
vercel env rm LEXNET_MANAGED_PERSISTENCE_PROVIDER production
vercel env rm LEXNET_MANAGED_DATABASE_URL production
vercel --prod   # redeploy without postgres → throws on mutate, reads still work
```

---

## Notes

- `POSTGRES_URL` (pooled, Neon's pgbouncer) is fine for app reads/writes
- Use `POSTGRES_URL_NON_POOLING` for migrations and the import script (transactional DDL needs direct connection)
- `LEXNET_PRODUCTION_AUTH_SECRET` rotation: see `docs/PILOT_RUNBOOK.md`
- If demo-mode preview deploys are needed, set `LEXNET_RUNTIME_MODE=local-demo` + `LEXNET_ENABLE_DEMO_PRIVATE_API=true` for the Preview environment
