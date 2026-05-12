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
import {
  buildPublishedPassports,
  buildPublicPassportView,
  findPublicPassport,
} from "../src/lib/platform/passports";
import { createCommerceCase } from "../src/lib/lexnet-domain";
import type { CommerceCase } from "../src/lib/lexnet-types";

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

const reviewedCase: CommerceCase = {
  ...createCommerceCase(
    {
      title: "Reviewed platform case",
      buyer: "0x1111111111111111111111111111111111111111",
      seller: "0x2222222222222222222222222222222222222222",
      agreementText: "Agreement text long enough for public passport redaction tests",
      acceptanceCriteria: ["done"],
      amountReference: 5200,
    },
    { id: "lx-case-reviewed", createdAt: "2026-05-12T10:00:00.000Z" },
  ),
  status: "VERIFIED",
  verificationReport: {
    verdict: "APPROVE",
    score: 91,
    summary: "Complete",
    recommendation: "Release settlement recommendation",
    sellerShareBps: 10000,
    reviewedAt: "2026-05-12T11:00:00.000Z",
    riskFlags: [],
    source: "local",
  },
};

test("buildPublishedPassports creates deterministic unpublished private records from reviewed cases", () => {
  const passports = buildPublishedPassports(
    [reviewedCase],
    "workspace-demo",
    "2026-05-12T12:00:00.000Z",
  );
  const buyerPassport = passports.find((passport) => passport.role === "buyer");

  assert.equal(passports.length, 2);
  assert.ok(buyerPassport);
  assert.match(buyerPassport.slug, /^buyer-0x1111-lexnet-[a-f0-9]{8}$/);
  assert.equal(buyerPassport.party, "0x1111111111111111111111111111111111111111");
  assert.equal(buyerPassport.workspaceId, "workspace-demo");
  assert.equal(buyerPassport.updatedAt, "2026-05-12T12:00:00.000Z");
  assert.equal(buyerPassport.publishedAt, "");
  assert.deepEqual(buyerPassport.caseIds, ["lx-case-reviewed"]);

  const rebuilt = buildPublishedPassports(
    [reviewedCase],
    "workspace-demo",
    "2026-05-12T12:00:00.000Z",
  );
  assert.deepEqual(rebuilt, passports);
});

test("buildPublishedPassports preserves mixed-case party in deterministic slug digest", () => {
  const mixedCase: CommerceCase = {
    ...reviewedCase,
    buyer: "0xAbCdEf1111111111111111111111111111111111",
  };

  const [buyerPassport] = buildPublishedPassports(
    [mixedCase],
    "workspace-demo",
    "2026-05-12T12:00:00.000Z",
  ).filter((passport) => passport.role === "buyer");

  assert.ok(buyerPassport);
  assert.equal(buyerPassport.slug, "buyer-0xabcd-lexnet-c4018583");
});

test("buildPublicPassportView redacts private subject and includes value band and publishedAt", () => {
  const [buyerPassport] = buildPublishedPassports(
    [reviewedCase],
    "workspace-demo",
    "2026-05-12T12:00:00.000Z",
  ).filter((passport) => passport.role === "buyer");
  const publishedPassport = {
    ...buyerPassport,
    publishedAt: "2026-05-12T12:30:00.000Z",
  };

  const publicView = buildPublicPassportView(publishedPassport);

  assert.equal(publicView.party, "0x1111...1111");
  assert.equal(publicView.totalReferencedValue, "$5k-$10k");
  assert.equal(publicView.publishedAt, "2026-05-12T12:30:00.000Z");
  assert.equal(JSON.stringify(publicView).includes("0x1111111111111111111111111111111111111111"), false);
});

test("findPublicPassport returns null for unpublished passports and privacy-safe public views for published passports", () => {
  const [buyerPassport] = buildPublishedPassports(
    [reviewedCase],
    "workspace-demo",
    "2026-05-12T12:00:00.000Z",
  ).filter((passport) => passport.role === "buyer");

  assert.equal(findPublicPassport([buyerPassport], buyerPassport.slug), null);

  const publicView = findPublicPassport(
    [{ ...buyerPassport, publishedAt: "2026-05-12T12:30:00.000Z" }],
    buyerPassport.slug,
  );

  assert.ok(publicView);
  assert.equal(publicView.party, "0x1111...1111");
  assert.equal(Object.prototype.hasOwnProperty.call(publicView, "party"), true);
  assert.equal(JSON.stringify(publicView).includes("0x1111111111111111111111111111111111111111"), false);
});
