# Production Hardening and Demo Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the LexNet demo path and harden the backend-backed MVP so the next review can run a clean, realistic, production-boundary-aware demo.

**Architecture:** Keep changes incremental and local to the existing Next.js/TypeScript frontend. Add small platform helpers for backend-store mode, backup/restore safety, and auth token parsing; expose them through existing scripts/routes/UI where needed; prove each behavior with Node tests before wiring UI/docs.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Node `tsx --test`, filesystem JSON platform store at `.lexnet-data/store.json`, existing demo-private API guard, existing local GenLayer readiness facade.

---

## File Structure

- Modify `frontend/src/lib/platform/store.ts` — add backend-only case selection helpers so seeded backend demos do not merge old fallback cases.
- Modify `frontend/src/lib/lexnet-service.ts` — use backend-only cases when the platform store is available.
- Modify `frontend/tests/platform.test.ts` — add tests for backend-only case behavior, backup/restore, auth tokens, and dev port selection.
- Create `frontend/src/lib/platform/backup.ts` — pure backup/restore helpers for platform store snapshots.
- Create `frontend/scripts/demo-backup.ts` — local CLI export for `.lexnet-data/store.json` snapshot.
- Create `frontend/scripts/demo-restore.ts` — local CLI restore from a selected backup file.
- Create `frontend/scripts/dev-port.ts` — deterministic port selection helper for demo-safe dev server startup.
- Create `frontend/scripts/demo-dev.ts` — CLI wrapper that starts Next dev on an available port, preferring `3002` then `3003`.
- Modify `frontend/package.json` — add `demo:backup`, `demo:restore`, and `demo:dev` scripts.
- Modify `frontend/src/lib/platform/auth.ts` — add optional demo bearer token support without removing `x-lexnet-operator-id` compatibility.
- Modify `frontend/src/app/api/security/status/route.ts` and/or `frontend/src/lib/platform/api.ts` — expose hardening status fields for demo auth, store mode, and backup command availability.
- Modify `frontend/src/components/CommerceDashboardClient.tsx` or the relevant status component — display concise hardening status in the dashboard if the API already provides it.
- Create `frontend/src/lib/genlayer-client.ts` — isolate real `genlayer-js` loading behind a small adapter so app code does not depend on SDK internals directly.
- Modify `frontend/src/lib/lexnet-contract.ts` — add guarded execution planning/result types that use the adapter only when readiness checks pass.
- Create `frontend/app/api/genlayer/verify-case/route.ts` or `frontend/src/app/api/genlayer/verify-case/route.ts` following current App Router path conventions — expose demo-private guarded GenLayer write endpoint for `verify_case`.
- Modify `frontend/src/components/ContractCallPreview.tsx` and/or `frontend/src/components/CaseDetailClient.tsx` — display real SDK execution status without claiming success unless a transaction result is returned.
- Modify `README.md`, `docs/CURRENT_MAP.md`, and `ARCHITECTURE.md` — document the polished demo workflow, GenLayer SDK boundary, and production boundary.

---

### Task 1: Use backend store cases as the primary demo source

**Why:** UI verification showed the dashboard on the correct worktree displayed 6 seeded backend cases plus 3 fallback cases, for 9 visible cases. For a polished seeded demo, a valid backend store should be the primary source; fallback cases should appear only when the backend store is unavailable or empty.

**Files:**
- Modify: `frontend/src/lib/platform/store.ts`
- Modify: `frontend/src/lib/lexnet-service.ts`
- Test: `frontend/tests/platform.test.ts`

- [ ] **Step 1: Write failing platform tests**

Add `getPrimaryPlatformCommerceCases` to the existing import from `../src/lib/platform/store` in `frontend/tests/platform.test.ts`:

```ts
import {
  appendAuditEvent,
  createDefaultPlatformStore,
  getDashboardPlatformData,
  getPlatformCommerceCases,
  getPrimaryPlatformCommerceCases,
  getPublicPassportView,
  getSafePassportRecords,
  readPlatformStore,
  toSafePassportRecords,
  writePlatformStore,
} from "../src/lib/platform/store";
```

Append these tests near the existing store merge tests:

```ts
test("getPrimaryPlatformCommerceCases returns store cases only when the backend store has cases", async () => {
  await withTempStore(async (storePath) => {
    const store = createDefaultPlatformStore();
    store.cases.push({
      ...reviewedCase,
      id: "lx-case-store-primary",
      title: "Store primary case",
      createdAt: "2026-05-12T14:00:00.000Z",
    });
    await writePlatformStore(store, storePath);

    const cases = await getPrimaryPlatformCommerceCases([reviewedCase], storePath);

    assert.deepEqual(cases.map((commerceCase) => commerceCase.id), ["lx-case-store-primary"]);
  });
});

test("getPrimaryPlatformCommerceCases falls back to seed cases when the backend store is empty", async () => {
  await withTempStore(async (storePath) => {
    await writePlatformStore(createDefaultPlatformStore(), storePath);

    const cases = await getPrimaryPlatformCommerceCases([reviewedCase], storePath);

    assert.deepEqual(cases.map((commerceCase) => commerceCase.id), ["lx-case-reviewed"]);
  });
});

test("getDashboardPlatformData uses backend store cases as primary demo cases", async () => {
  await withTempStore(async (storePath) => {
    const store = createDefaultPlatformStore();
    store.cases.push({
      ...reviewedCase,
      id: "lx-case-dashboard-primary",
      title: "Dashboard primary case",
      createdAt: "2026-05-12T15:00:00.000Z",
    });
    await writePlatformStore(store, storePath);

    const data = await getDashboardPlatformData([reviewedCase], storePath);

    assert.deepEqual(data.cases.map((commerceCase) => commerceCase.id), ["lx-case-dashboard-primary"]);
    assert.equal(data.platformSummary?.caseCount, 1);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm --prefix frontend run test:platform
```

Expected: FAIL because `getPrimaryPlatformCommerceCases` is not exported and dashboard still merges fallback cases.

- [ ] **Step 3: Implement backend-primary helper**

In `frontend/src/lib/platform/store.ts`, add this helper after `mergePlatformCommerceCases`:

```ts
export function selectPrimaryPlatformCommerceCases(
  seedCases: CommerceCase[],
  storeCases: CommerceCase[],
): CommerceCase[] {
  const sourceCases = storeCases.length > 0 ? storeCases : seedCases;
  return [...sourceCases].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}
```

Then change `getDashboardPlatformData()` to use the helper:

```ts
return {
  cases: selectPrimaryPlatformCommerceCases(seedCases, store.cases),
  platformSummary: buildPlatformSummary(store),
  queueItems: toDashboardQueueItems(store.queue),
  backendStoreStatus: "available",
};
```

Add this exported async helper after `getDashboardPlatformData()`:

```ts
export async function getPrimaryPlatformCommerceCases(
  seedCases: CommerceCase[],
  storePath = DEFAULT_PLATFORM_STORE_PATH,
): Promise<CommerceCase[]> {
  try {
    const store = await readPlatformStore(storePath);
    return selectPrimaryPlatformCommerceCases(seedCases, store.cases);
  } catch {
    return [...seedCases].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }
}
```

Keep `mergePlatformCommerceCases()` and `getPlatformCommerceCases()` in place if other code still uses merge semantics.

- [ ] **Step 4: Wire service reads to backend-primary helper**

In `frontend/src/lib/lexnet-service.ts`, change the platform store import from:

```ts
import { getPlatformCommerceCases } from "./platform/store";
```

to:

```ts
import { getPrimaryPlatformCommerceCases } from "./platform/store";
```

Change `getAllCommerceCases()` from:

```ts
return getPlatformCommerceCases(CASES);
```

to:

```ts
return getPrimaryPlatformCommerceCases(CASES);
```

- [ ] **Step 5: Run platform and domain tests**

Run:

```bash
npm --prefix frontend run test:platform
npm --prefix frontend run test:domain
```

Expected: both pass. Existing merge tests for `getPlatformCommerceCases()` should still pass because merge behavior remains available for callers that explicitly need it.

- [ ] **Step 6: Verify seeded dashboard count manually**

Run:

```bash
npm --prefix frontend run demo:seed
npx next dev -p 3003
```

Open `http://localhost:3003/` and confirm:

- Backend Store shows `Persisted Cases 6`.
- Case Inbox visible count is `6 case records visible`, not `9`.

Stop the dev server and run:

```bash
npm --prefix frontend run demo:reset
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/platform/store.ts frontend/src/lib/lexnet-service.ts frontend/tests/platform.test.ts
git commit -m "fix: prefer backend cases for seeded demos"
```

---

### Task 2: Add port-safe demo dev command

**Why:** UI verification initially opened port `3002`, but that port was occupied by a server from the original checkout. A demo-specific dev command should prefer `3002`, automatically fall back to `3003`, and print the selected URL.

**Files:**
- Create: `frontend/scripts/dev-port.ts`
- Create: `frontend/scripts/demo-dev.ts`
- Modify: `frontend/package.json`
- Test: `frontend/tests/platform.test.ts`

- [ ] **Step 1: Add failing tests for port selection and package script**

Append this import to `frontend/tests/platform.test.ts`:

```ts
import { chooseDemoDevPort } from "../scripts/dev-port";
```

Extend the package script test to include:

```ts
assert.equal(packageJson.scripts["demo:dev"], "tsx scripts/demo-dev.ts");
```

Append these tests:

```ts
test("chooseDemoDevPort prefers 3002 when it is available", async () => {
  const selected = await chooseDemoDevPort({
    preferredPorts: [3002, 3003],
    isPortAvailable: async () => true,
  });

  assert.equal(selected, 3002);
});

test("chooseDemoDevPort falls back to 3003 when 3002 is unavailable", async () => {
  const selected = await chooseDemoDevPort({
    preferredPorts: [3002, 3003],
    isPortAvailable: async (port) => port !== 3002,
  });

  assert.equal(selected, 3003);
});

test("chooseDemoDevPort fails when no preferred ports are available", async () => {
  await assert.rejects(
    chooseDemoDevPort({
      preferredPorts: [3002, 3003],
      isPortAvailable: async () => false,
    }),
    /No available demo dev port/,
  );
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm --prefix frontend run test:platform
```

Expected: FAIL because `../scripts/dev-port` and `demo:dev` do not exist.

- [ ] **Step 3: Implement reusable port helper**

Create `frontend/scripts/dev-port.ts`:

```ts
import { createServer } from "node:net";

export type ChooseDemoDevPortOptions = {
  preferredPorts?: number[];
  isPortAvailable?: (port: number) => Promise<boolean>;
};

export async function chooseDemoDevPort({
  preferredPorts = [3002, 3003],
  isPortAvailable = isTcpPortAvailable,
}: ChooseDemoDevPortOptions = {}): Promise<number> {
  for (const port of preferredPorts) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(`No available demo dev port. Checked: ${preferredPorts.join(", ")}`);
}

export function isTcpPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}
```

- [ ] **Step 4: Implement demo dev script**

Create `frontend/scripts/demo-dev.ts`:

```ts
import { spawn } from "node:child_process";

import { chooseDemoDevPort } from "./dev-port";

async function main() {
  const port = await chooseDemoDevPort();
  console.log(`Starting LexNet demo dev server at http://localhost:${port}`);

  const child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "-p", String(port)],
    { stdio: "inherit" },
  );

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exitCode = code ?? 0;
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

- [ ] **Step 5: Add package script**

In `frontend/package.json`, add:

```json
"demo:dev": "tsx scripts/demo-dev.ts"
```

Keep the existing `dev` script unchanged.

- [ ] **Step 6: Run tests**

Run:

```bash
npm --prefix frontend run test:platform
```

Expected: PASS.

- [ ] **Step 7: Verify manual behavior**

With no server on port 3002, run:

```bash
npm --prefix frontend run demo:dev
```

Expected: output includes `Starting LexNet demo dev server at http://localhost:3002`.

Stop the server. If port 3002 is occupied, run again and verify output includes `http://localhost:3003`.

- [ ] **Step 8: Commit**

```bash
git add frontend/scripts/dev-port.ts frontend/scripts/demo-dev.ts frontend/package.json frontend/tests/platform.test.ts
git commit -m "feat: add port-safe demo dev command"
```

---

### Task 3: Add local backup and restore scripts

**Why:** The demo has a local filesystem store. Before production hardening, operators need safe local snapshot/restore commands that do not include secrets and do not overwrite invalid data silently.

**Files:**
- Create: `frontend/src/lib/platform/backup.ts`
- Create: `frontend/scripts/demo-backup.ts`
- Create: `frontend/scripts/demo-restore.ts`
- Modify: `frontend/package.json`
- Test: `frontend/tests/platform.test.ts`

- [ ] **Step 1: Add failing tests for backup and restore helpers**

Add imports to `frontend/tests/platform.test.ts`:

```ts
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import {
  backupPlatformStore,
  restorePlatformStore,
} from "../src/lib/platform/backup";
```

If `mkdir` or `dirname` conflicts with existing imports, merge them into existing `node:fs/promises` and `node:path` imports.

Extend the package script test:

```ts
assert.equal(packageJson.scripts["demo:backup"], "tsx scripts/demo-backup.ts");
assert.equal(packageJson.scripts["demo:restore"], "tsx scripts/demo-restore.ts");
```

Append tests:

```ts
test("backupPlatformStore writes a deterministic backup file and returns its path", async () => {
  await withTempStore(async (storePath) => {
    const backupPath = join(dirname(storePath), "backups", "store-backup.json");
    await seedDemoPlatformStore(storePath);

    const result = await backupPlatformStore({ storePath, backupPath });
    const backupRaw = await readFile(result.backupPath, "utf8");
    const backupStore = JSON.parse(backupRaw) as { cases: unknown[]; publishedPassports: unknown[] };

    assert.equal(result.backupPath, backupPath);
    assert.equal(backupStore.cases.length, 6);
    assert.equal(backupStore.publishedPassports.length, 2);
  });
});

test("restorePlatformStore restores a valid backup", async () => {
  await withTempStore(async (storePath) => {
    const backupPath = join(dirname(storePath), "backups", "store-backup.json");
    const original = await seedDemoPlatformStore(storePath);
    await backupPlatformStore({ storePath, backupPath });
    await writePlatformStore(createDefaultPlatformStore(), storePath);

    const restored = await restorePlatformStore({ storePath, backupPath });

    assert.equal(restored.cases.length, original.cases.length);
    assert.equal((await readPlatformStore(storePath)).cases.length, original.cases.length);
  });
});

test("restorePlatformStore rejects invalid backup JSON without overwriting current store", async () => {
  await withTempStore(async (storePath) => {
    const backupPath = join(dirname(storePath), "backups", "invalid.json");
    await mkdir(dirname(backupPath), { recursive: true });
    await seedDemoPlatformStore(storePath);
    await writeFile(backupPath, "{ invalid json", "utf8");

    await assert.rejects(
      restorePlatformStore({ storePath, backupPath }),
      /Invalid backup JSON/,
    );

    assert.equal((await readPlatformStore(storePath)).cases.length, 6);
  });
});

test("restorePlatformStore rejects malformed backup schema without overwriting current store", async () => {
  await withTempStore(async (storePath) => {
    const backupPath = join(dirname(storePath), "backups", "malformed.json");
    await mkdir(dirname(backupPath), { recursive: true });
    await seedDemoPlatformStore(storePath);
    await writeFile(backupPath, JSON.stringify({ version: 1, cases: [{}] }), "utf8");

    await assert.rejects(
      restorePlatformStore({ storePath, backupPath }),
      /Invalid platform store schema/,
    );

    assert.equal((await readPlatformStore(storePath)).cases.length, 6);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm --prefix frontend run test:platform
```

Expected: FAIL because `../src/lib/platform/backup` and package scripts do not exist.

- [ ] **Step 3: Implement backup helper**

Create `frontend/src/lib/platform/backup.ts`:

```ts
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import {
  DEFAULT_PLATFORM_STORE_PATH,
  readPlatformStore,
  writePlatformStore,
} from "./store";
import type { PlatformStore } from "./types";

export type BackupPlatformStoreOptions = {
  storePath?: string;
  backupPath?: string;
  createdAt?: string;
};

export type RestorePlatformStoreOptions = {
  storePath?: string;
  backupPath: string;
};

export async function backupPlatformStore({
  storePath = DEFAULT_PLATFORM_STORE_PATH,
  backupPath,
  createdAt = new Date().toISOString(),
}: BackupPlatformStoreOptions = {}): Promise<{ backupPath: string; store: PlatformStore }> {
  const store = await readPlatformStore(storePath);
  const targetPath = backupPath ?? buildDefaultBackupPath(storePath, createdAt);
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  return { backupPath: targetPath, store };
}

export async function restorePlatformStore({
  storePath = DEFAULT_PLATFORM_STORE_PATH,
  backupPath,
}: RestorePlatformStoreOptions): Promise<PlatformStore> {
  const raw = await readFile(backupPath, "utf8");
  let parsed: PlatformStore;
  try {
    parsed = JSON.parse(raw) as PlatformStore;
  } catch (error) {
    throw new Error(`Invalid backup JSON at ${backupPath}`, { cause: error });
  }

  const tempPath = `${storePath}.restore-validate-${Date.now()}`;
  await writePlatformStore(parsed, tempPath);
  const validated = await readPlatformStore(tempPath);
  await writePlatformStore(validated, storePath);
  return validated;
}

function buildDefaultBackupPath(storePath: string, createdAt: string): string {
  const stamp = createdAt.replace(/\D/g, "").slice(0, 14);
  return join(dirname(storePath), "backups", `store-${stamp}.json`);
}
```

- [ ] **Step 4: Fix restore validation cleanup**

The initial restore helper writes a temp file for schema validation. Update `frontend/src/lib/platform/backup.ts` to import `rm` and remove the temp file in a `finally` block:

```ts
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
```

Replace the validation block with:

```ts
const tempPath = `${storePath}.restore-validate-${Date.now()}`;
try {
  await writePlatformStore(parsed, tempPath);
  const validated = await readPlatformStore(tempPath);
  await writePlatformStore(validated, storePath);
  return validated;
} finally {
  await rm(tempPath, { force: true });
}
```

- [ ] **Step 5: Implement CLI scripts**

Create `frontend/scripts/demo-backup.ts`:

```ts
import { backupPlatformStore } from "../src/lib/platform/backup";

async function main() {
  const result = await backupPlatformStore();
  console.log(`Backed up .lexnet-data/store.json to ${result.backupPath}`);
  console.log(`Snapshot includes ${result.store.cases.length} cases and ${result.store.publishedPassports.length} passports.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Create `frontend/scripts/demo-restore.ts`:

```ts
import { restorePlatformStore } from "../src/lib/platform/backup";

async function main() {
  const backupPath = process.argv[2];
  if (!backupPath) {
    throw new Error("Usage: npm --prefix frontend run demo:restore -- <backup-path>");
  }

  const store = await restorePlatformStore({ backupPath });
  console.log(`Restored .lexnet-data/store.json from ${backupPath}`);
  console.log(`Restored ${store.cases.length} cases and ${store.publishedPassports.length} passports.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

- [ ] **Step 6: Add package scripts**

In `frontend/package.json`, add:

```json
"demo:backup": "tsx scripts/demo-backup.ts",
"demo:restore": "tsx scripts/demo-restore.ts"
```

- [ ] **Step 7: Run platform tests**

Run:

```bash
npm --prefix frontend run test:platform
```

Expected: PASS.

- [ ] **Step 8: Manual backup/restore verification**

Run:

```bash
npm --prefix frontend run demo:seed
npm --prefix frontend run demo:backup
```

Copy the printed backup path, then run:

```bash
npm --prefix frontend run demo:reset
npm --prefix frontend run demo:restore -- <printed-backup-path>
npm --prefix frontend run demo:reset
```

Expected:

- Backup prints a path under `.lexnet-data/backups/`.
- Restore prints restored case/passport counts.
- Final reset removes `.lexnet-data/store.json`.
- `.lexnet-data/` remains ignored and untracked.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/lib/platform/backup.ts frontend/scripts/demo-backup.ts frontend/scripts/demo-restore.ts frontend/package.json frontend/tests/platform.test.ts
git commit -m "feat: add local demo backup and restore"
```

---

### Task 4: Harden demo-private auth with optional bearer token

**Why:** Existing demo-private APIs are protected by `LEXNET_ENABLE_DEMO_PRIVATE_API=true` plus `x-lexnet-operator-id: operator-demo`. Keep that compatibility for local demos, but add an optional token check for more production-like pilot demos.

**Files:**
- Modify: `frontend/src/lib/platform/auth.ts`
- Modify: `frontend/tests/platform.test.ts`
- Modify: `README.md`
- Modify: `docs/CURRENT_MAP.md`

- [ ] **Step 1: Write failing auth tests**

In `frontend/tests/platform.test.ts`, append:

```ts
test("authorizeDemoPrivateApi accepts demo operator header when no demo API token is configured", () => {
  const store = createDefaultPlatformStore();
  const request = new Request("http://lexnet.local/api/passports", {
    headers: { "x-lexnet-operator-id": "operator-demo" },
  });

  const authorization = authorizeDemoPrivateApi(
    request,
    { LEXNET_ENABLE_DEMO_PRIVATE_API: "true" },
    store,
  );

  assert.equal(authorization.authorized, true);
});

test("authorizeDemoPrivateApi rejects missing bearer token when demo API token is configured", async () => {
  const store = createDefaultPlatformStore();
  const request = new Request("http://lexnet.local/api/passports", {
    headers: { "x-lexnet-operator-id": "operator-demo" },
  });

  const authorization = authorizeDemoPrivateApi(
    request,
    {
      LEXNET_ENABLE_DEMO_PRIVATE_API: "true",
      LEXNET_DEMO_PRIVATE_API_TOKEN: "demo-token",
    },
    store,
  );

  assert.equal(authorization.authorized, false);
  assert.equal(await authorization.response.json(), { error: "Unauthorized." });
});

test("authorizeDemoPrivateApi accepts matching bearer token when demo API token is configured", () => {
  const store = createDefaultPlatformStore();
  const request = new Request("http://lexnet.local/api/passports", {
    headers: {
      "x-lexnet-operator-id": "operator-demo",
      authorization: "Bearer demo-token",
    },
  });

  const authorization = authorizeDemoPrivateApi(
    request,
    {
      LEXNET_ENABLE_DEMO_PRIVATE_API: "true",
      LEXNET_DEMO_PRIVATE_API_TOKEN: "demo-token",
    },
    store,
  );

  assert.equal(authorization.authorized, true);
});

test("authorizeDemoPrivateApi rejects mismatched bearer token when demo API token is configured", () => {
  const store = createDefaultPlatformStore();
  const request = new Request("http://lexnet.local/api/passports", {
    headers: {
      "x-lexnet-operator-id": "operator-demo",
      authorization: "Bearer wrong-token",
    },
  });

  const authorization = authorizeDemoPrivateApi(
    request,
    {
      LEXNET_ENABLE_DEMO_PRIVATE_API: "true",
      LEXNET_DEMO_PRIVATE_API_TOKEN: "demo-token",
    },
    store,
  );

  assert.equal(authorization.authorized, false);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm --prefix frontend run test:platform
```

Expected: FAIL because `LEXNET_DEMO_PRIVATE_API_TOKEN` is ignored.

- [ ] **Step 3: Implement optional token check**

In `frontend/src/lib/platform/auth.ts`, update `DemoPrivateApiEnv`:

```ts
type DemoPrivateApiEnv = {
  [key: string]: string | undefined;
  LEXNET_ENABLE_DEMO_PRIVATE_API?: string;
  LEXNET_DEMO_PRIVATE_API_TOKEN?: string;
};
```

Add helper:

```ts
function hasValidDemoToken(request: Request, expectedToken: string | undefined): boolean {
  if (!expectedToken) {
    return true;
  }

  const authorization = request.headers.get("authorization") ?? "";
  return authorization === `Bearer ${expectedToken}`;
}
```

In `authorizeDemoPrivateApi()`, after `isDemoOperatorRequest()` succeeds and before `getDemoOperator()`, add:

```ts
if (!hasValidDemoToken(request, env.LEXNET_DEMO_PRIVATE_API_TOKEN)) {
  return { authorized: false, response: jsonError("Unauthorized.", 401) };
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm --prefix frontend run test:platform
```

Expected: PASS.

- [ ] **Step 5: Document optional token**

In `README.md`, under demo-private backend API config, change the block to:

```bash
LEXNET_ENABLE_DEMO_PRIVATE_API=true
LEXNET_DEMO_PRIVATE_API_TOKEN=
```

Below the `x-lexnet-operator-id` header section, add:

```markdown
If `LEXNET_DEMO_PRIVATE_API_TOKEN` is set, demo-private API requests must also include `Authorization: Bearer <token>`. Leave it blank for local-only demos.
```

In `docs/CURRENT_MAP.md`, add `LEXNET_DEMO_PRIVATE_API_TOKEN=` under demo-private backend API configuration and mention the optional bearer header.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/platform/auth.ts frontend/tests/platform.test.ts README.md docs/CURRENT_MAP.md
git commit -m "feat: add optional demo API bearer token"
```

---

### Task 5: Expand security status for hardening readiness

**Why:** The dashboard and `/api/security/status` should communicate what is ready for demo/pilot and what remains local-only. This reduces accidental claims that demo-private auth or filesystem persistence are production-ready.

**Files:**
- Modify: `frontend/src/lib/platform/api.ts`
- Modify: `frontend/src/app/api/security/status/route.ts`
- Modify: `frontend/tests/platform.test.ts`
- Optionally modify: `frontend/src/components/CommerceDashboardClient.tsx` if the dashboard already displays security status fields from this route.

- [ ] **Step 1: Write failing tests for security status fields**

In `frontend/tests/platform.test.ts`, add:

```ts
test("buildSecurityStatus reports demo API and persistence readiness", () => {
  const status = buildSecurityStatus({
    NEXT_PUBLIC_GENLAYER_RPC_URL: "https://studio.genlayer.com/api",
    NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS: "0x123",
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: "wallet-project",
    LEXNET_ENABLE_DEMO_PRIVATE_API: "true",
    LEXNET_DEMO_PRIVATE_API_TOKEN: "demo-token",
  });

  assert.equal(status.demoPrivateApiEnabled, true);
  assert.equal(status.demoPrivateApiTokenConfigured, true);
  assert.equal(status.productionAuthConfigured, false);
  assert.equal(status.persistenceMode, "filesystem-local");
  assert.equal(status.blockingReasons.includes("Production authentication is not configured."), true);
});

test("buildSecurityStatus reports missing demo API token as a warning reason when demo API is enabled", () => {
  const status = buildSecurityStatus({
    NEXT_PUBLIC_GENLAYER_RPC_URL: "https://studio.genlayer.com/api",
    LEXNET_ENABLE_DEMO_PRIVATE_API: "true",
  });

  assert.equal(status.demoPrivateApiEnabled, true);
  assert.equal(status.demoPrivateApiTokenConfigured, false);
  assert.equal(status.blockingReasons.includes("Demo-private API token is not configured."), true);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm --prefix frontend run test:platform
```

Expected: FAIL because `SecurityStatus` lacks these fields.

- [ ] **Step 3: Extend security status types**

In `frontend/src/lib/platform/api.ts`, update `SecurityStatus`:

```ts
export interface SecurityStatus {
  genLayerRpcUrlConfigured: boolean;
  contractAddressConfigured: boolean;
  walletConnectProjectIdConfigured: boolean;
  demoPrivateApiEnabled: boolean;
  demoPrivateApiTokenConfigured: boolean;
  productionAuthConfigured: boolean;
  storeMode: "filesystem";
  persistenceMode: "filesystem-local";
  blockingReasons: string[];
}
```

Update `SecurityStatusEnv`:

```ts
interface SecurityStatusEnv {
  [key: string]: string | undefined;
  NEXT_PUBLIC_GENLAYER_RPC_URL?: string;
  NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS?: string;
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?: string;
  LEXNET_ENABLE_DEMO_PRIVATE_API?: string;
  LEXNET_DEMO_PRIVATE_API_TOKEN?: string;
  LEXNET_PRODUCTION_AUTH_PROVIDER?: string;
}
```

Update `buildSecurityStatus()`:

```ts
const demoPrivateApiEnabled = env.LEXNET_ENABLE_DEMO_PRIVATE_API === "true";
const demoPrivateApiTokenConfigured = Boolean(env.LEXNET_DEMO_PRIVATE_API_TOKEN);
const productionAuthConfigured = Boolean(env.LEXNET_PRODUCTION_AUTH_PROVIDER);
```

Add blocking reasons:

```ts
if (demoPrivateApiEnabled && !demoPrivateApiTokenConfigured) {
  blockingReasons.push("Demo-private API token is not configured.");
}
if (!productionAuthConfigured) {
  blockingReasons.push("Production authentication is not configured.");
}
```

Return the new fields:

```ts
return {
  genLayerRpcUrlConfigured,
  contractAddressConfigured,
  walletConnectProjectIdConfigured,
  demoPrivateApiEnabled,
  demoPrivateApiTokenConfigured,
  productionAuthConfigured,
  storeMode: "filesystem",
  persistenceMode: "filesystem-local",
  blockingReasons,
};
```

- [ ] **Step 4: Pass explicit env keys from route**

In `frontend/src/app/api/security/status/route.ts`, ensure the route passes only explicit env keys:

```ts
const status = buildSecurityStatus({
  NEXT_PUBLIC_GENLAYER_RPC_URL: process.env.NEXT_PUBLIC_GENLAYER_RPC_URL,
  NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS,
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  LEXNET_ENABLE_DEMO_PRIVATE_API: process.env.LEXNET_ENABLE_DEMO_PRIVATE_API,
  LEXNET_DEMO_PRIVATE_API_TOKEN: process.env.LEXNET_DEMO_PRIVATE_API_TOKEN,
  LEXNET_PRODUCTION_AUTH_PROVIDER: process.env.LEXNET_PRODUCTION_AUTH_PROVIDER,
});
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm --prefix frontend run test:platform
```

Expected: PASS.

- [ ] **Step 6: Update dashboard only if needed**

If `frontend/src/components/CommerceDashboardClient.tsx` or a readiness component already displays `/api/security/status`, add small labels for:

- `Demo API: Enabled/Disabled`
- `Token: Configured/Missing`
- `Persistence: filesystem-local`
- `Production auth: Missing/Configured`

If the dashboard does not consume `/api/security/status`, do not add new fetching for this task; keep it API/test only.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/platform/api.ts frontend/src/app/api/security/status/route.ts frontend/tests/platform.test.ts frontend/src/components/CommerceDashboardClient.tsx
git commit -m "feat: expand security readiness status"
```

If `CommerceDashboardClient.tsx` was not changed, omit it from `git add`.

---

### Task 6: Document production hardening workflow

**Why:** The README and project map should tell a future demo operator exactly how to run the polished demo and what is not production-ready yet.

**Files:**
- Modify: `README.md`
- Modify: `docs/CURRENT_MAP.md`
- Modify: `ARCHITECTURE.md`

- [ ] **Step 1: Update README demo workflow**

In `README.md`, add this after the `## Demo Seed` section:

```markdown
## Recommended Demo Workflow

From the repository/worktree root:

```bash
npm --prefix frontend run demo:seed
npm --prefix frontend run demo:dev
```

Open the URL printed by `demo:dev`. It prefers `http://localhost:3002` and falls back to `http://localhost:3003` if another checkout is already using port `3002`.

After the demo:

```bash
npm --prefix frontend run demo:backup
npm --prefix frontend run demo:reset
```

Use `demo:backup` before resetting when you want to keep a local snapshot of `.lexnet-data/store.json`. Backups remain local under `.lexnet-data/` and must not be committed.
```

- [ ] **Step 2: Update README production boundary**

Extend the `## Production Boundary` section with:

```markdown
Current hardening status:

- Demo-private APIs can require both `x-lexnet-operator-id: operator-demo` and an optional `Authorization: Bearer <token>` header.
- Filesystem persistence is local demo/pilot infrastructure, not a managed production database.
- Backup/restore commands are local operational tools, not a managed disaster recovery system.
- Real production auth, managed persistence, evidence retention policy, deployment observability, and audited GenLayer transaction execution remain separate production work.
```

- [ ] **Step 3: Update CURRENT_MAP active scripts and env**

In `docs/CURRENT_MAP.md`, list these additional active scripts:

```bash
npm --prefix frontend run demo:dev
npm --prefix frontend run demo:backup
npm --prefix frontend run demo:restore -- <backup-path>
```

Add script entries:

```markdown
- `frontend/scripts/demo-dev.ts` — starts the demo dev server on the first available demo port.
- `frontend/scripts/dev-port.ts` — selects demo dev ports, preferring `3002` then `3003`.
- `frontend/scripts/demo-backup.ts` — writes a local `.lexnet-data/store.json` backup.
- `frontend/scripts/demo-restore.ts` — restores `.lexnet-data/store.json` from a selected local backup.
```

Add env entries:

```bash
LEXNET_DEMO_PRIVATE_API_TOKEN=
LEXNET_PRODUCTION_AUTH_PROVIDER=
```

- [ ] **Step 4: Update ARCHITECTURE hardening section**

In `ARCHITECTURE.md`, add a short section:

```markdown
## Demo Hardening Boundary

The demo hardening layer improves local pilot operation without claiming production readiness. `demo:dev` avoids port collisions, `demo:backup` and `demo:restore` manage local filesystem snapshots, and demo-private APIs may require an optional bearer token.

These controls do not replace production authentication, managed database storage, monitored backups, evidence retention policy, or audited GenLayer transaction execution.
```

- [ ] **Step 5: Run docs diff review**

Run:

```bash
git diff -- README.md docs/CURRENT_MAP.md ARCHITECTURE.md
```

Expected: docs mention demo workflow, port fallback, backup/restore locality, optional bearer token, and production boundary. They must not claim production auth, managed persistence, or on-chain settlement execution is complete.

- [ ] **Step 6: Commit**

```bash
git add README.md docs/CURRENT_MAP.md ARCHITECTURE.md
git commit -m "docs: document production hardening workflow"
```

---

### Task 7: Add guarded GenLayer SDK execution path

**Why:** The project already depends on `genlayer-js`, and the demo should progress toward real GenLayer execution without fake on-chain success. This task adds a narrow SDK boundary that can submit a real `verify_case` call only when public config, wallet/operator authorization, and explicit execution intent are present. Local verification remains the fallback.

**Files:**
- Create: `frontend/src/lib/genlayer-client.ts`
- Modify: `frontend/src/lib/lexnet-contract.ts`
- Create: `frontend/src/app/api/genlayer/verify-case/route.ts`
- Modify: `frontend/src/components/ContractCallPreview.tsx` and/or `frontend/src/components/CaseDetailClient.tsx`
- Modify: `frontend/tests/platform.test.ts`
- Modify: `README.md`
- Modify: `docs/CURRENT_MAP.md`
- Modify: `ARCHITECTURE.md`

- [ ] **Step 1: Write failing tests for SDK adapter boundaries**

Append tests to `frontend/tests/platform.test.ts` that mock the SDK boundary instead of importing vendored SDK internals directly:

```ts
import {
  buildGenLayerVerifyCaseRequest,
  createGenLayerClientAdapter,
  type GenLayerSdkModule,
} from "../src/lib/genlayer-client";
import {
  buildVerifyCaseExecutionPlan,
  getLexNetContractReadiness,
} from "../src/lib/lexnet-contract";
```

Add these tests:

```ts
test("buildGenLayerVerifyCaseRequest maps LexNet verify_case payload for genlayer-js", () => {
  const request = buildGenLayerVerifyCaseRequest({
    contractAddress: "0xcontract",
    method: "verify_case",
    payload: { case_id: "lx-case-demo-settlement" },
  });

  assert.equal(request.contractAddress, "0xcontract");
  assert.equal(request.method, "verify_case");
  assert.deepEqual(request.args, ["lx-case-demo-settlement"]);
});

test("createGenLayerClientAdapter submits through injected genlayer-js client and returns SDK result", async () => {
  const calls: unknown[] = [];
  const sdk: GenLayerSdkModule = {
    createClient: ({ rpcUrl }) => ({
      writeContract: async (request) => {
        calls.push({ rpcUrl, request });
        return { transactionHash: "0xrealreceipt", status: "submitted" };
      },
    }),
  };

  const adapter = createGenLayerClientAdapter({ sdk, rpcUrl: "https://studio.genlayer.com/api" });
  const result = await adapter.verifyCase({
    contractAddress: "0xcontract",
    caseId: "lx-case-demo-settlement",
  });

  assert.deepEqual(result, { transactionHash: "0xrealreceipt", status: "submitted" });
  assert.equal(calls.length, 1);
});

test("buildVerifyCaseExecutionPlan blocks SDK execution until readiness passes", () => {
  const readiness = getLexNetContractReadiness({
    env: {
      NEXT_PUBLIC_GENLAYER_RPC_URL: "https://studio.genlayer.com/api",
      NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS: "0xcontract",
    },
    walletConnected: false,
  });

  const plan = buildVerifyCaseExecutionPlan(
    { ...reviewedCase, id: "lx-case-demo-settlement" },
    readiness,
  );

  assert.equal(plan.enabled, false);
  assert.equal(plan.blockingReasons.includes("Wallet is not connected."), true);
});

test("buildVerifyCaseExecutionPlan enables SDK execution only with full readiness", () => {
  const readiness = getLexNetContractReadiness({
    env: {
      NEXT_PUBLIC_GENLAYER_RPC_URL: "https://studio.genlayer.com/api",
      NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS: "0xcontract",
    },
    walletConnected: true,
  });

  const plan = buildVerifyCaseExecutionPlan(
    { ...reviewedCase, id: "lx-case-demo-settlement" },
    readiness,
  );

  assert.equal(plan.enabled, true);
  assert.equal(plan.request.contractAddress, "0xcontract");
  assert.deepEqual(plan.request.args, ["lx-case-demo-settlement"]);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm --prefix frontend run test:platform
```

Expected: FAIL because `frontend/src/lib/genlayer-client.ts` and `buildVerifyCaseExecutionPlan()` do not exist.

- [ ] **Step 3: Implement a narrow GenLayer SDK adapter**

Create `frontend/src/lib/genlayer-client.ts`:

```ts
export interface GenLayerVerifyCaseInput {
  contractAddress: string;
  caseId: string;
}

export interface GenLayerContractRequest {
  contractAddress: string;
  method: "verify_case";
  args: string[];
}

export interface GenLayerExecutionResult {
  transactionHash?: string;
  status?: string;
  raw: unknown;
}

export interface GenLayerSdkClient {
  writeContract?: (request: GenLayerContractRequest) => Promise<unknown>;
  callContract?: (request: GenLayerContractRequest) => Promise<unknown>;
}

export interface GenLayerSdkModule {
  createClient?: (options: { rpcUrl: string }) => GenLayerSdkClient;
  createGenLayerClient?: (options: { rpcUrl: string }) => GenLayerSdkClient;
}

export interface GenLayerClientAdapterOptions {
  sdk: GenLayerSdkModule;
  rpcUrl: string;
}

export interface GenLayerClientAdapter {
  verifyCase(input: GenLayerVerifyCaseInput): Promise<GenLayerExecutionResult>;
}

export function buildGenLayerVerifyCaseRequest({
  contractAddress,
  method,
  payload,
}: {
  contractAddress: string;
  method: "verify_case";
  payload: { case_id: string };
}): GenLayerContractRequest {
  return {
    contractAddress,
    method,
    args: [payload.case_id],
  };
}

export function createGenLayerClientAdapter({
  sdk,
  rpcUrl,
}: GenLayerClientAdapterOptions): GenLayerClientAdapter {
  const createClient = sdk.createClient ?? sdk.createGenLayerClient;
  if (!createClient) {
    throw new Error("genlayer-js client factory is unavailable.");
  }

  const client = createClient({ rpcUrl });

  return {
    async verifyCase(input) {
      const request = buildGenLayerVerifyCaseRequest({
        contractAddress: input.contractAddress,
        method: "verify_case",
        payload: { case_id: input.caseId },
      });
      const execute = client.writeContract ?? client.callContract;
      if (!execute) {
        throw new Error("genlayer-js contract execution method is unavailable.");
      }

      return normalizeExecutionResult(await execute(request));
    },
  };
}

export async function loadGenLayerSdk(): Promise<GenLayerSdkModule> {
  return import("genlayer-js") as Promise<GenLayerSdkModule>;
}

function normalizeExecutionResult(raw: unknown): GenLayerExecutionResult {
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    return {
      transactionHash:
        typeof record.transactionHash === "string"
          ? record.transactionHash
          : typeof record.hash === "string"
            ? record.hash
            : undefined,
      status: typeof record.status === "string" ? record.status : undefined,
      raw,
    };
  }

  return { raw };
}
```

If the real installed SDK exposes different factory or execution names, update this adapter only after inspecting the installed package/types. Do not edit vendored `genlayer-js`.

- [ ] **Step 4: Add execution plan types to contract facade**

In `frontend/src/lib/lexnet-contract.ts`, import:

```ts
import {
  buildGenLayerVerifyCaseRequest,
  type GenLayerContractRequest,
} from "./genlayer-client";
```

Add interface:

```ts
export interface LexNetVerifyCaseExecutionPlan {
  enabled: boolean;
  blockingReasons: string[];
  request: GenLayerContractRequest;
}
```

Add helper after `buildVerifyCaseCallPreview()`:

```ts
export function buildVerifyCaseExecutionPlan(
  commerceCase: CommerceCase,
  readiness: LexNetContractReadiness,
): LexNetVerifyCaseExecutionPlan {
  const contractAddress = readiness.contractAddress ?? "";
  return {
    enabled: readiness.isReady,
    blockingReasons: [...readiness.blockingReasons],
    request: buildGenLayerVerifyCaseRequest({
      contractAddress,
      method: "verify_case",
      payload: { case_id: commerceCase.id },
    }),
  };
}
```

- [ ] **Step 5: Add guarded API endpoint for real SDK execution**

Create `frontend/src/app/api/genlayer/verify-case/route.ts`:

```ts
import { NextResponse } from "next/server";

import { authorizeDemoPrivateApi } from "../../../../lib/platform/auth";
import { readPlatformStore } from "../../../../lib/platform/store";
import { createGenLayerClientAdapter, loadGenLayerSdk } from "../../../../lib/genlayer-client";
import {
  buildVerifyCaseExecutionPlan,
  getLexNetContractReadiness,
} from "../../../../lib/lexnet-contract";

export async function POST(request: Request) {
  const store = await readPlatformStore();
  const authorization = authorizeDemoPrivateApi(request, process.env, store);
  if (!authorization.authorized) {
    return authorization.response;
  }

  const body = (await request.json()) as { caseId?: string; walletConnected?: boolean };
  const commerceCase = store.cases.find((candidate) => candidate.id === body.caseId);
  if (!commerceCase) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  const readiness = getLexNetContractReadiness({
    env: process.env,
    walletConnected: body.walletConnected === true,
  });
  const plan = buildVerifyCaseExecutionPlan(commerceCase, readiness);
  if (!plan.enabled) {
    return NextResponse.json(
      { error: "GenLayer execution is not ready.", blockingReasons: plan.blockingReasons },
      { status: 409 },
    );
  }

  const sdk = await loadGenLayerSdk();
  const adapter = createGenLayerClientAdapter({ sdk, rpcUrl: readiness.rpcUrl });
  const result = await adapter.verifyCase({
    contractAddress: plan.request.contractAddress,
    caseId: commerceCase.id,
  });

  return NextResponse.json({ status: "submitted", result });
}
```

This endpoint must remain demo-private and guarded. It must not write a settlement, passport, or audit event that claims on-chain finality unless the SDK result contains a verifiable transaction result.

- [ ] **Step 6: Wire UI without fake success claims**

In `frontend/src/components/ContractCallPreview.tsx` and/or `frontend/src/components/CaseDetailClient.tsx`, keep the existing disabled state when readiness is incomplete. If adding a button for SDK execution, use copy like:

```tsx
<button disabled={!preview.enabled}>Submit GenLayer verify_case</button>
```

After a successful API response, display only the returned SDK status/hash:

```tsx
{genLayerResult?.transactionHash ? (
  <p>GenLayer transaction submitted: {genLayerResult.transactionHash}</p>
) : null}
{genLayerResult?.status ? <p>SDK status: {genLayerResult.status}</p> : null}
```

Do not display `Settlement complete`, `Funds released`, `On-chain verified`, or similar finality language unless a later task validates final contract state from GenLayer.

- [ ] **Step 7: Document GenLayer SDK boundary**

In `README.md`, add:

```markdown
## GenLayer SDK Boundary

LexNet uses `genlayer-js` only behind the local `genlayer-client` adapter. The guarded `verify_case` path may submit a real SDK call when contract address, RPC URL, wallet/operator readiness, and demo-private authorization all pass.

Local verification remains the fallback. The UI must not claim settlement completion, fund movement, or on-chain finality unless a real SDK result and later contract-state verification prove it.
```

In `docs/CURRENT_MAP.md`, list:

```markdown
- `frontend/src/lib/genlayer-client.ts` — narrow adapter around `genlayer-js`; app code should use this boundary instead of SDK internals.
- `frontend/src/app/api/genlayer/verify-case/route.ts` — demo-private guarded SDK write endpoint for `verify_case`.
```

In `ARCHITECTURE.md`, mention that `genlayer-js` integration is adapter-based, guarded, and non-custodial.

- [ ] **Step 8: Run verification**

Run:

```bash
npm --prefix frontend run test:platform
npm --prefix frontend exec tsc -- --noEmit
npm --prefix frontend run build
```

Expected: all pass. If `genlayer-js` types differ from the adapter assumptions, inspect installed SDK typings/package exports and update only `frontend/src/lib/genlayer-client.ts` plus tests.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/lib/genlayer-client.ts frontend/src/lib/lexnet-contract.ts frontend/src/app/api/genlayer/verify-case/route.ts frontend/src/components/ContractCallPreview.tsx frontend/src/components/CaseDetailClient.tsx frontend/tests/platform.test.ts README.md docs/CURRENT_MAP.md ARCHITECTURE.md
git commit -m "feat: add guarded GenLayer SDK execution path"
```

Omit unchanged UI files from `git add` if the existing UI already communicates guarded preview clearly.

---

### Task 8: Final production-hardening verification pass

**Files:**
- No source changes expected unless verification reveals a defect.

- [ ] **Step 1: Seed demo data**

Run:

```bash
npm --prefix frontend run demo:seed
```

Expected output includes:

```text
Seeded LexNet demo store with 6 cases, 4 queue items, and 2 passports.
Public passport: /passport/buyer-0x4f9a-lexnet-d86156e8
```

- [ ] **Step 2: Run platform tests**

Run:

```bash
npm --prefix frontend run test:platform
```

Expected: all tests pass, including backend-primary case tests, port selection tests, backup/restore tests, optional bearer auth tests, security status tests, and guarded GenLayer SDK adapter tests.

- [ ] **Step 3: Run domain tests**

Run:

```bash
npm --prefix frontend run test:domain
```

Expected: all tests pass.

- [ ] **Step 4: Run TypeScript check**

Run:

```bash
npm --prefix frontend exec tsc -- --noEmit
```

Expected: exit 0 with no TypeScript errors.

- [ ] **Step 5: Run production build**

Run:

```bash
npm --prefix frontend run build
```

Expected: build succeeds.

- [ ] **Step 6: Verify demo dev command**

Run:

```bash
npm --prefix frontend run demo:dev
```

Expected: output prints either:

```text
Starting LexNet demo dev server at http://localhost:3002
```

or, if port 3002 is occupied:

```text
Starting LexNet demo dev server at http://localhost:3003
```

Open the printed URL and verify:

- Dashboard Case Inbox shows 6 seeded cases when backend store has cases.
- Backend Store shows 6 persisted cases, 4 reports, 2 passports, and audit events.
- `/cases/lx-case-demo-settlement` shows local verification report, guarded GenLayer preview, and no enabled write path unless readiness checks pass.
- If GenLayer execution is configured, SDK response copy shows only submitted status/hash returned by `genlayer-js`, not settlement finality.
- `/passports` shows two published backend records.
- `/passport/buyer-0x4f9a-lexnet-d86156e8` shows redacted aggregate public data only.

Stop the dev server after verification.

- [ ] **Step 7: Verify backup/restore manually**

Run:

```bash
npm --prefix frontend run demo:backup
```

Copy the printed backup path. Then run:

```bash
npm --prefix frontend run demo:reset
npm --prefix frontend run demo:restore -- <printed-backup-path>
```

Expected: restore reports 6 cases and 2 passports.

- [ ] **Step 8: Reset generated local data**

Run:

```bash
npm --prefix frontend run demo:reset
```

Expected: `.lexnet-data/store.json` is removed.

- [ ] **Step 9: Verify git status**

Run:

```bash
git status --short
```

Expected: clean; no `.lexnet-data/` files tracked or staged.

- [ ] **Step 10: Optional CodeRabbit review through WSL**

If CodeRabbit is requested or available through WSL, run from WSL with translated worktree git env:

```bash
cd /mnt/e/Dapp/LexNet/.claude/worktrees/production-backbone && \
GIT_DIR=/mnt/e/Dapp/LexNet/.git/worktrees/production-backbone \
GIT_COMMON_DIR=/mnt/e/Dapp/LexNet/.git \
GIT_WORK_TREE=/mnt/e/Dapp/LexNet/.claude/worktrees/production-backbone \
/root/.local/bin/coderabbit review --agent -t committed --base-commit fd7cde9
```

Expected: no critical or warning findings. Fix any critical/warning issues in a new commit and rerun relevant tests.

- [ ] **Step 11: Commit validation fixes only if needed**

If verification revealed defects and fixes were needed:

```bash
git add <changed files>
git commit -m "fix: stabilize production hardening demo"
```

If no files changed, do not create an empty commit.
