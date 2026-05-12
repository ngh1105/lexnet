import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  appendAuditEvent,
  createDefaultPlatformStore,
  readPlatformStore,
  writePlatformStore,
} from "../src/lib/platform/store";

async function withTempStore(run: (storePath: string) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), "lexnet-platform-"));
  try {
    await run(join(dir, "store.json"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("createDefaultPlatformStore includes demo workspace, operator, queue, and audit arrays", () => {
  const store = createDefaultPlatformStore();
  assert.equal(store.version, 1);
  assert.equal(store.workspaces.length, 1);
  assert.equal(store.operators.length, 1);
  assert.equal(store.memberships.length, 1);
  assert.equal(Array.isArray(store.queue), true);
  assert.equal(Array.isArray(store.auditEvents), true);
});

test("readPlatformStore creates a persisted default store when missing", async () => {
  await withTempStore(async (storePath) => {
    const store = await readPlatformStore(storePath);
    const raw = await readFile(storePath, "utf8");
    assert.equal(store.version, 1);
    assert.equal(JSON.parse(raw).version, 1);
  });
});

test("readPlatformStore rejects invalid JSON without overwriting it", async () => {
  await withTempStore(async (storePath) => {
    await writeFile(storePath, "{ invalid json", "utf8");

    await assert.rejects(
      readPlatformStore(storePath),
      /Invalid platform store JSON/,
    );

    assert.equal(await readFile(storePath, "utf8"), "{ invalid json");
  });
});

test("readPlatformStore rejects malformed store schema without overwriting it", async () => {
  await withTempStore(async (storePath) => {
    const malformed = JSON.stringify({
      ...createDefaultPlatformStore(),
      memberships: [
        {
          id: "membership-bad",
          workspaceId: "workspace-demo",
          operatorId: "operator-demo",
          role: "superuser",
          createdAt: "2026-05-12T00:00:00.000Z",
        },
      ],
    });
    await writeFile(storePath, malformed, "utf8");

    await assert.rejects(
      readPlatformStore(storePath),
      /Invalid platform store schema/,
    );

    assert.equal(await readFile(storePath, "utf8"), malformed);
  });
});

test("writePlatformStore persists platform data", async () => {
  await withTempStore(async (storePath) => {
    const store = createDefaultPlatformStore();
    store.workspaces[0].name = "Pilot Workspace";
    await writePlatformStore(store, storePath);
    const reloaded = await readPlatformStore(storePath);
    assert.equal(reloaded.workspaces[0]?.name, "Pilot Workspace");
  });
});

test("appendAuditEvent records operational metadata", async () => {
  await withTempStore(async (storePath) => {
    const event = await appendAuditEvent(
      {
        type: "case.created",
        actorId: "operator-demo",
        entityType: "case",
        entityId: "lx-case-test",
        detail: "Created test case",
      },
      storePath,
      "2026-05-12T12:00:00.000Z",
    );
    const store = await readPlatformStore(storePath);
    assert.equal(event.id, "audit-20260512120000000-case-created");
    assert.equal(store.auditEvents.length, 1);
    assert.equal(store.auditEvents[0]?.type, "case.created");
  });
});
