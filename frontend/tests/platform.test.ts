import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  appendAuditEvent,
  createDefaultPlatformStore,
  getDashboardPlatformData,
  getPlatformCommerceCases,
  getPublicPassportView,
  getSafePassportRecords,
  readPlatformStore,
  toSafePassportRecords,
  writePlatformStore,
} from "../src/lib/platform/store";
import {
  buildPublishedPassports,
  buildPublicPassportView,
  buildSubjectKey,
  findPublicPassport,
} from "../src/lib/platform/passports";
import {
  buildDemoPlatformStore,
  getDemoSeedPublicPassportSlugs,
  resetDemoPlatformStore,
  seedDemoPlatformStore,
} from "../src/lib/platform/demo-seed";
import {
  buildSecurityStatus,
  checkRateLimit,
  resetRateLimitForTests,
} from "../src/lib/platform/api";
import { authorizeDemoPrivateApi, isDemoOperatorRequest } from "../src/lib/platform/auth";
import { createCommerceCase } from "../src/lib/lexnet-domain";
import type { CommerceCase } from "../src/lib/lexnet-types";
import packageJson from "../package.json" with { type: "json" };

async function withTempStore(run: (storePath: string) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), "lexnet-platform-"));
  try {
    await run(join(dir, "store.json"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("package scripts expose demo seed and reset commands", () => {
  assert.equal(packageJson.scripts["demo:seed"], "tsx scripts/demo-seed.ts");
  assert.equal(packageJson.scripts["demo:reset"], "tsx scripts/demo-reset.ts");
});

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

test("getDashboardPlatformData returns seed cases and no backend data when store is corrupt", async () => {
  await withTempStore(async (storePath) => {
    await writeFile(storePath, "{ invalid json", "utf8");
    const seedCases = [reviewedCase];

    const data = await getDashboardPlatformData(seedCases, storePath);

    assert.deepEqual(data.cases, seedCases);
    assert.equal(data.platformSummary, undefined);
    assert.deepEqual(data.queueItems, []);
    assert.equal(data.backendStoreStatus, "unavailable");
  });
});

test("getPlatformCommerceCases returns seed cases when store JSON is invalid", async () => {
  await withTempStore(async (storePath) => {
    await writeFile(storePath, "{ invalid json", "utf8");
    const seedCases = [reviewedCase];

    const cases = await getPlatformCommerceCases(seedCases, storePath);

    assert.deepEqual(cases, seedCases);
  });
});

test("getPlatformCommerceCases returns seed cases when store schema is invalid", async () => {
  await withTempStore(async (storePath) => {
    await writeFile(
      storePath,
      JSON.stringify({ ...createDefaultPlatformStore(), cases: [{}] }),
      "utf8",
    );
    const seedCases = [reviewedCase];

    const cases = await getPlatformCommerceCases(seedCases, storePath);

    assert.deepEqual(cases, seedCases);
  });
});

test("getPlatformCommerceCases merges valid store cases over seed cases", async () => {
  await withTempStore(async (storePath) => {
    const store = createDefaultPlatformStore();
    const storedCase: CommerceCase = {
      ...reviewedCase,
      title: "Stored case wins",
      createdAt: "2026-05-12T12:00:00.000Z",
    };
    const newerStoreCase: CommerceCase = {
      ...reviewedCase,
      id: "lx-case-newer-store",
      title: "Newer stored case",
      createdAt: "2026-05-12T13:00:00.000Z",
    };
    store.cases.push(storedCase, newerStoreCase);
    await writePlatformStore(store, storePath);

    const cases = await getPlatformCommerceCases([reviewedCase], storePath);

    assert.deepEqual(
      cases.map((commerceCase) => commerceCase.id),
      ["lx-case-newer-store", "lx-case-reviewed"],
    );
    assert.equal(cases[1]?.title, "Stored case wins");
  });
});

test("getDashboardPlatformData serializes only dashboard queue fields", async () => {
  await withTempStore(async (storePath) => {
    const store = createDefaultPlatformStore();
    store.queue.push({
      id: "queue-private",
      workspaceId: "workspace-secret",
      caseId: "lx-case-reviewed",
      status: "in_review",
      priority: "high",
      assignedOperatorId: "operator-secret",
      createdAt: "2026-05-12T12:00:00.000Z",
      updatedAt: "2026-05-12T12:30:00.000Z",
    });
    await writePlatformStore(store, storePath);

    const data = await getDashboardPlatformData([reviewedCase], storePath);
    const serialized = JSON.stringify(data.queueItems);

    assert.equal(data.queueItems.length, 1);
    assert.deepEqual(Object.keys(data.queueItems[0] ?? {}).sort(), [
      "caseId",
      "createdAt",
      "id",
      "priority",
      "status",
      "updatedAt",
    ]);
    assert.equal(serialized.includes("workspace-secret"), false);
    assert.equal(serialized.includes("operator-secret"), false);
  });
});

test("getSafePassportRecords returns backend passport DTOs with only safe identifiers", async () => {
  await withTempStore(async (storePath) => {
    const store = createDefaultPlatformStore();
    const [buyerPassport] = buildPublishedPassports(
      [reviewedCase],
      "workspace-demo",
      "2026-05-12T12:00:00.000Z",
    ).filter((passport) => passport.role === "buyer");
    store.publishedPassports.push({
      ...buyerPassport,
      publishedAt: "2026-05-12T12:30:00.000Z",
    });
    await writePlatformStore(store, storePath);

    const records = await getSafePassportRecords(storePath);
    const serialized = JSON.stringify(records);

    assert.equal(records.length, 1);
    assert.deepEqual(Object.keys(records[0] ?? {}).sort(), [
      "averageScore",
      "id",
      "published",
      "publishedAt",
      "redactedSubject",
      "riskFlags",
      "role",
      "slug",
      "sourceReportCount",
      "subjectKey",
      "totalCases",
      "totalReferencedValue",
      "trustLevel",
      "updatedAt",
      "verifiedCases",
    ]);
    assert.equal(records[0]?.redactedSubject, "0x1111...1111");
    assert.equal(records[0]?.subjectKey, buildSubjectKey("buyer", "0x1111111111111111111111111111111111111111"));
    assert.equal(records[0]?.published, true);
    assert.equal(serialized.includes("workspace-demo"), false);
    assert.equal(serialized.includes("0x1111111111111111111111111111111111111111"), false);
  });
});

test("buildDemoPlatformStore creates a full command-center demo store", () => {
  const store = buildDemoPlatformStore();

  assert.equal(store.version, 1);
  assert.equal(store.workspaces.length, 1);
  assert.equal(store.workspaces[0]?.name, "LexNet Pilot Command Center");
  assert.equal(store.operators.length >= 2, true);
  assert.equal(store.operators.some((operator) => operator.id === "operator-demo"), true);
  assert.equal(store.memberships.length >= 2, true);
  assert.equal(store.cases.length >= 5, true);
  assert.equal(store.cases.length <= 7, true);
  assert.equal(store.queue.length >= 3, true);
  assert.equal(store.publishedPassports.length >= 2, true);
  assert.equal(store.auditEvents.length >= store.cases.length, true);

  const statuses = new Set(store.cases.map((commerceCase) => commerceCase.status));
  assert.equal(statuses.has("ACTIVE"), true);
  assert.equal(statuses.has("EVIDENCE_SUBMITTED"), true);
  assert.equal(statuses.has("UNDER_AI_REVIEW"), true);
  assert.equal(statuses.has("VERIFIED"), true);
  assert.equal(statuses.has("REVISION_REQUESTED"), true);
  assert.equal(statuses.has("SETTLEMENT_RECOMMENDED"), true);

  assert.equal(
    store.cases.some((commerceCase) => commerceCase.verificationReport?.source === "local"),
    true,
  );
  assert.equal(
    store.cases.every((commerceCase) => commerceCase.verificationReport?.source !== "genlayer-contract"),
    true,
  );
});

test("buildDemoPlatformStore publishes deterministic public passports", () => {
  const store = buildDemoPlatformStore();
  const publicSlugs = getDemoSeedPublicPassportSlugs(store).sort();

  assert.equal(publicSlugs.length >= 2, true);
  for (const slug of publicSlugs) {
    assert.notEqual(findPublicPassport(store.publishedPassports, slug), null);
  }
});

test("buildDemoPlatformStore does not seed private keys or fake on-chain claims", () => {
  const serialized = JSON.stringify(buildDemoPlatformStore()).toLowerCase();

  assert.equal(serialized.includes("privatekey"), false);
  assert.equal(serialized.includes("private_key"), false);
  assert.equal(serialized.includes("mnemonic"), false);
  assert.equal(serialized.includes("seed phrase"), false);
  assert.equal(serialized.includes("api token"), false);
  assert.equal(serialized.includes("on-chain settlement succeeded"), false);
  assert.equal(serialized.includes("funds moved"), false);
});

test("resetDemoPlatformStore removes the store without recreating it", async () => {
  await withTempStore(async (storePath) => {
    await seedDemoPlatformStore(storePath);

    await resetDemoPlatformStore(storePath);

    await assert.rejects(access(storePath));
  });
});

test("buildSubjectKey distinguishes subjects with identical redaction shape", () => {
  const first = buildSubjectKey("buyer", "0x1111111111111111111111111111111111111111");
  const second = buildSubjectKey("buyer", "0x1111222222222222222222222222222222221111");

  assert.notEqual(first, second);
});

test("toSafePassportRecords reports generated DTO count", () => {
  const passports = buildPublishedPassports(
    [reviewedCase],
    "workspace-demo",
    "2026-05-12T12:00:00.000Z",
  );

  const records = toSafePassportRecords(passports);

  assert.equal(records.count, 2);
  assert.equal(records.passports.length, 2);
});

test("getSafePassportRecords falls back to an empty list when store is corrupt", async () => {
  await withTempStore(async (storePath) => {
    await writeFile(storePath, "{ invalid json", "utf8");

    assert.deepEqual(await getSafePassportRecords(storePath), []);
  });
});

test("getPublicPassportView hides unpublished, missing, and corrupt store passports", async () => {
  await withTempStore(async (storePath) => {
    const store = createDefaultPlatformStore();
    const [buyerPassport] = buildPublishedPassports(
      [reviewedCase],
      "workspace-demo",
      "2026-05-12T12:00:00.000Z",
    ).filter((passport) => passport.role === "buyer");
    store.publishedPassports.push(buyerPassport);
    await writePlatformStore(store, storePath);

    assert.equal(await getPublicPassportView(buyerPassport.slug, storePath), null);
    assert.equal(await getPublicPassportView("missing", storePath), null);

    store.publishedPassports[0] = {
      ...buyerPassport,
      publishedAt: "2026-05-12T12:30:00.000Z",
    };
    await writePlatformStore(store, storePath);

    const publicView = await getPublicPassportView(buyerPassport.slug, storePath);

    assert.ok(publicView);
    assert.equal(publicView.party, "0x1111...1111");
    assert.equal(publicView.totalReferencedValue, "$5k-$10k");
    assert.equal(JSON.stringify(publicView).includes("0x1111111111111111111111111111111111111111"), false);

    await writeFile(storePath, "{ invalid json", "utf8");
    assert.equal(await getPublicPassportView(buyerPassport.slug, storePath), null);
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

test("buildSecurityStatus reports configured and missing environment settings", () => {
  const security = buildSecurityStatus({
    NEXT_PUBLIC_GENLAYER_RPC_URL: "https://rpc.testnet.genlayer.com",
    NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS: "",
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: "walletconnect-test",
  });

  assert.equal(security.genLayerRpcUrlConfigured, true);
  assert.equal(security.contractAddressConfigured, false);
  assert.equal(security.walletConnectProjectIdConfigured, true);
  assert.equal(security.storeMode, "filesystem");
  assert.deepEqual(security.blockingReasons, [
    "Contract address is not configured.",
  ]);
});

test("checkRateLimit blocks the third call within a time window", () => {
  resetRateLimitForTests();

  assert.deepEqual(checkRateLimit("case-create", 2, 60_000, 1_000), {
    allowed: true,
    remaining: 1,
  });
  assert.deepEqual(checkRateLimit("case-create", 2, 60_000, 2_000), {
    allowed: true,
    remaining: 0,
  });
  assert.deepEqual(checkRateLimit("case-create", 2, 60_000, 3_000), {
    allowed: false,
    remaining: 0,
  });

  resetRateLimitForTests();
});

test("checkRateLimit allows calls after the time window expires", () => {
  resetRateLimitForTests();

  assert.deepEqual(checkRateLimit("case-create", 2, 60_000, 1_000), {
    allowed: true,
    remaining: 1,
  });
  assert.deepEqual(checkRateLimit("case-create", 2, 60_000, 2_000), {
    allowed: true,
    remaining: 0,
  });
  assert.deepEqual(checkRateLimit("case-create", 2, 60_000, 62_000), {
    allowed: true,
    remaining: 1,
  });

  resetRateLimitForTests();
});

test("isDemoOperatorRequest rejects missing demo operator header", () => {
  const request = new Request("https://lexnet.local/api/operators");

  assert.equal(isDemoOperatorRequest(request), false);
});

test("isDemoOperatorRequest accepts operator-demo header", () => {
  const request = new Request("https://lexnet.local/api/operators", {
    headers: { "x-lexnet-operator-id": "operator-demo" },
  });

  assert.equal(isDemoOperatorRequest(request), true);
});

test("authorizeDemoPrivateApi rejects demo header when private demo API flag is missing", () => {
  const request = new Request("https://lexnet.local/api/operators", {
    headers: { "x-lexnet-operator-id": "operator-demo" },
  });

  const result = authorizeDemoPrivateApi(request, {}, createDefaultPlatformStore());

  assert.equal(result.authorized, false);
  assert.equal(result.response.status, 404);
});

test("authorizeDemoPrivateApi accepts demo header when private demo API flag is enabled", () => {
  const request = new Request("https://lexnet.local/api/operators", {
    headers: { "x-lexnet-operator-id": "operator-demo" },
  });

  const result = authorizeDemoPrivateApi(
    request,
    { LEXNET_ENABLE_DEMO_PRIVATE_API: "true" },
    createDefaultPlatformStore(),
  );

  assert.equal(result.authorized, true);
  if (result.authorized) {
    assert.equal(result.operator.id, "operator-demo");
  }
});
