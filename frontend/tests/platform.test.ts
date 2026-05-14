import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

import {
  appendAuditEvent,
  appendGenLayerExecution,
  createDefaultPlatformStore,
  getDashboardPlatformData,
  getPlatformCommerceCases,
  getPrimaryPlatformCommerceCases,
  getPublicPassportView,
  getSafePassportRecords,
  readPlatformStore,
  toSafePassportRecords,
  updateLatestGenLayerExecutionProof,
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
import {
  buildAuthReadiness,
  buildEvidencePolicyStatus,
  buildGenLayerReadinessStatus,
  buildPersistenceReadiness,
  buildPlatformReadinessStatus,
  getLexNetRuntimeMode,
  type PlatformReadinessEnv,
} from "../src/lib/platform/readiness";
import { buildPilotSummary } from "../src/lib/platform/pilot-summary";
import {
  backupPlatformStore,
  restorePlatformStore,
} from "../src/lib/platform/backup";
import {
  buildGenLayerGetCaseRequest,
  buildGenLayerVerifyCaseRequest,
  classifyGenLayerCaseProof,
  createGenLayerClientAdapter,
  type GenLayerSdkModule,
} from "../src/lib/genlayer-client";
import {
  buildVerifyCaseExecutionPlan,
  getLexNetContractReadiness,
} from "../src/lib/lexnet-contract";
import { chooseDemoDevPort } from "../scripts/dev-port";
import {
  findForbiddenStoreSecretKeys,
  parseRawStoreForSecretScan,
  getGitIgnoreOutput,
  isPathIgnoredByGitOutput,
  shouldFailPilotCheck,
} from "../scripts/pilot-check";
import { canRunPilotPrepare } from "../scripts/pilot-prepare";
import { createCommerceCase } from "../src/lib/lexnet-domain";
import type { CommerceCase } from "../src/lib/lexnet-types";
import type { GenLayerExecutionRecord } from "../src/lib/platform/types";
import { buildGenLayerExecutionViewModel } from "../src/lib/genlayer-execution";
import packageJson from "../package.json" with { type: "json" };

async function withTempStore(run: (storePath: string) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), "lexnet-platform-"));
  try {
    await run(join(dir, "store.json"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("package scripts expose demo seed, reset, dev, and pilot commands", () => {
  assert.equal(packageJson.scripts["demo:seed"], "tsx scripts/demo-seed.ts");
  assert.equal(packageJson.scripts["demo:reset"], "tsx scripts/demo-reset.ts");
  assert.equal(packageJson.scripts["demo:dev"], "tsx scripts/demo-dev.ts");
  assert.equal(packageJson.scripts["demo:backup"], "tsx scripts/demo-backup.ts");
  assert.equal(packageJson.scripts["demo:restore"], "tsx scripts/demo-restore.ts");
  assert.equal(packageJson.scripts["pilot:check"], "tsx scripts/pilot-check.ts");
  assert.equal(packageJson.scripts["pilot:prepare"], "tsx scripts/pilot-prepare.ts");
});

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

test("createDefaultPlatformStore includes demo workspace, operator, queue, and audit arrays", () => {
  const store = createDefaultPlatformStore();
  assert.equal(store.version, 1);
  assert.equal(store.workspaces.length, 1);
  assert.equal(store.operators.length, 1);
  assert.equal(store.memberships.length, 1);
  assert.equal(Array.isArray(store.queue), true);
  assert.equal(Array.isArray(store.auditEvents), true);
  assert.deepEqual(store.genLayerExecutions, []);
});

test("getLexNetRuntimeMode defaults to local demo", () => {
  assert.equal(getLexNetRuntimeMode({}), "local-demo");
  assert.equal(getLexNetRuntimeMode({ LEXNET_RUNTIME_MODE: "pilot" }), "pilot");
  assert.equal(getLexNetRuntimeMode({ LEXNET_RUNTIME_MODE: "production" }), "production");
  assert.equal(getLexNetRuntimeMode({ LEXNET_RUNTIME_MODE: "unexpected" }), "local-demo");
});

test("buildAuthReadiness blocks production mutating routes without provider", () => {
  const readiness = buildAuthReadiness({
    LEXNET_RUNTIME_MODE: "production",
    LEXNET_ENABLE_DEMO_PRIVATE_API: "true",
  });

  assert.equal(readiness.mode, "production");
  assert.equal(readiness.demoPrivateApiEnabled, true);
  assert.equal(readiness.productionAuthConfigured, false);
  assert.equal(readiness.mutatingRoutesAllowed, false);
  assert.match(readiness.blockingReasons.join("\n"), /Production authentication is not configured/);
});

test("buildAuthReadiness allows pilot demo-private mode but reports production auth blocker", () => {
  const readiness = buildAuthReadiness({
    LEXNET_RUNTIME_MODE: "pilot",
    LEXNET_ENABLE_DEMO_PRIVATE_API: "true",
  });

  assert.equal(readiness.mode, "pilot");
  assert.equal(readiness.mutatingRoutesAllowed, true);
  assert.match(readiness.blockingReasons.join("\n"), /Production authentication is not configured/);
});

test("buildPersistenceReadiness requires managed persistence in production", () => {
  const missing = buildPersistenceReadiness({ LEXNET_RUNTIME_MODE: "production" });
  assert.equal(missing.mode, "managed-missing");
  assert.equal(missing.managedPersistenceConfigured, false);
  assert.match(missing.blockingReasons.join("\n"), /Managed persistence is not configured/);

  const configured = buildPersistenceReadiness({
    LEXNET_RUNTIME_MODE: "production",
    LEXNET_MANAGED_PERSISTENCE_PROVIDER: "managed-db",
  });
  assert.equal(configured.mode, "managed-configured");
  assert.equal(configured.managedPersistenceConfigured, true);
  assert.deepEqual(configured.blockingReasons, []);
});

test("buildPersistenceReadiness allows pilot filesystem persistence with warning", () => {
  const readiness = buildPersistenceReadiness({ LEXNET_RUNTIME_MODE: "pilot" });

  assert.equal(readiness.mode, "filesystem-local");
  assert.equal(readiness.filesystemPersistenceAllowed, true);
  assert.match(readiness.blockingReasons.join("\n"), /Local filesystem persistence is pilot infrastructure/);
});

test("buildEvidencePolicyStatus requires retention policy in production", () => {
  const readiness = buildEvidencePolicyStatus({ LEXNET_RUNTIME_MODE: "production" });

  assert.equal(readiness.allowPublicHttpsOnly, true);
  assert.equal(readiness.rawEvidenceStorage, "disabled");
  assert.equal(readiness.blockedPrivateNetworkHosts, true);
  assert.equal(readiness.retentionPolicyConfigured, false);
  assert.match(readiness.blockingReasons.join("\n"), /Evidence retention policy is not configured/);
});

test("buildPlatformReadinessStatus omits raw secret values and connection strings", () => {
  const env: PlatformReadinessEnv = {
    LEXNET_RUNTIME_MODE: "production",
    LEXNET_ENABLE_DEMO_PRIVATE_API: "true",
    LEXNET_DEMO_PRIVATE_API_TOKEN: "secret-token-value",
    LEXNET_PRODUCTION_AUTH_PROVIDER: "oauth-provider",
    LEXNET_MANAGED_DATABASE_URL: "postgres://user:password@example.com/db",
    LEXNET_EVIDENCE_RETENTION_POLICY: "90-days",
    NEXT_PUBLIC_GENLAYER_RPC_URL: "https://studio.genlayer.com/api",
    NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS: "0x1111111111111111111111111111111111111111",
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: "walletconnect-secret",
  };

  const status = buildPlatformReadinessStatus(env);
  const serialized = JSON.stringify(status);

  assert.equal(status.runtimeMode, "production");
  assert.equal(status.auth.productionAuthConfigured, true);
  assert.equal(Object.prototype.hasOwnProperty.call(status.auth, "productionAuthProvider"), false);
  assert.equal(status.persistence.managedPersistenceConfigured, true);
  assert.equal(serialized.includes("secret-token-value"), false);
  assert.equal(serialized.includes("oauth-provider"), false);
  assert.equal(serialized.includes("password@example.com"), false);
  assert.equal(serialized.includes("walletconnect-secret"), false);
});

test("buildGenLayerReadinessStatus requires explicit public RPC and contract configuration", () => {
  const missingRpc = buildGenLayerReadinessStatus({
    NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS: "0x1111111111111111111111111111111111111111",
  });

  assert.equal(missingRpc.rpcUrlConfigured, false);
  assert.equal(missingRpc.contractAddressConfigured, true);
  assert.equal(missingRpc.stateVerificationCapable, false);
  assert.equal(missingRpc.networkLabel, "Studionet");

  const configured = buildGenLayerReadinessStatus({
    NEXT_PUBLIC_GENLAYER_RPC_URL: "https://studio.genlayer.com/api",
    NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS: "0x1111111111111111111111111111111111111111",
    NEXT_PUBLIC_GENLAYER_NETWORK_LABEL: "Studionet",
  });

  assert.equal(configured.rpcUrlConfigured, true);
  assert.equal(configured.contractAddressConfigured, true);
  assert.equal(configured.stateVerificationCapable, true);
  assert.equal(configured.networkLabel, "Studionet");
});

test("appendGenLayerExecution records submitted execution metadata", async () => {
  await withTempStore(async (storePath) => {
    const execution = await appendGenLayerExecution(
      {
        id: "glex-lx-1-verify-case-2026-05-13T00:00:00.000Z",
        caseId: "lx-1",
        method: "verify_case",
        status: "submitted",
        transactionHash: "0xabc",
        contractAddress: "0x1111111111111111111111111111111111111111",
        rpcUrl: "https://studio.genlayer.com/api",
        networkLabel: "Studionet",
        submittedAt: "2026-05-13T00:00:00.000Z",
        blockingReasons: [],
      },
      storePath,
    );
    const store = await readPlatformStore(storePath);

    assert.equal(execution.status, "submitted");
    assert.equal(store.genLayerExecutions.length, 1);
    assert.equal(store.genLayerExecutions[0]?.caseId, "lx-1");
  });
});

test("updateLatestGenLayerExecutionProof marks latest case execution as state verified", async () => {
  await withTempStore(async (storePath) => {
    await appendGenLayerExecution(
      {
        id: "older",
        caseId: "lx-1",
        method: "verify_case",
        status: "submitted",
        contractAddress: "0x1111111111111111111111111111111111111111",
        rpcUrl: "https://studio.genlayer.com/api",
        networkLabel: "Studionet",
        submittedAt: "2026-05-13T00:00:00.000Z",
        blockingReasons: [],
      },
      storePath,
    );
    const updated = await updateLatestGenLayerExecutionProof(
      "lx-1",
      {
        status: "state_verified",
        checkedAt: "2026-05-13T00:05:00.000Z",
        proof: {
          contractCaseStatus: "VERIFIED",
          verificationReport: { verdict: "APPROVE", score: 91 },
        },
      },
      storePath,
    );

    assert.equal(updated?.status, "state_verified");
    assert.equal(updated?.proof?.contractCaseStatus, "VERIFIED");
  });
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

test("findForbiddenStoreSecretKeys reports nested forbidden key paths", () => {
  const findings = findForbiddenStoreSecretKeys({
    publicValue: "safe",
    privateKey: "secret",
    nested: {
      walletSecret: "secret",
      deeper: [{ mnemonic: "words" }],
    },
    array: [{ seedPhrase: "words" }],
  }).sort();

  assert.deepEqual(findings, [
    "array.0.seedPhrase",
    "nested.deeper.0.mnemonic",
    "nested.walletSecret",
    "privateKey",
  ]);
});

test("parseRawStoreForSecretScan warns and skips scanning invalid store JSON", () => {
  const parsed = parseRawStoreForSecretScan("{ invalid json");

  assert.equal(parsed.rawStore, null);
  assert.match(parsed.warning, /Invalid platform store JSON/);
  assert.deepEqual(findForbiddenStoreSecretKeys(parsed.rawStore), []);
  assert.equal(shouldFailPilotCheck("pilot", [], findForbiddenStoreSecretKeys(parsed.rawStore)), false);
});

test("shouldFailPilotCheck fails for secrets and production blockers only", () => {
  assert.equal(shouldFailPilotCheck("local-demo", [], []), false);
  assert.equal(shouldFailPilotCheck("pilot", ["pilot warning"], []), false);
  assert.equal(shouldFailPilotCheck("production", ["Managed persistence is not configured."], []), true);
  assert.equal(shouldFailPilotCheck("pilot", [], ["privateKey"]), true);
});

test("isPathIgnoredByGitOutput recognizes ignored git check output", () => {
  assert.equal(isPathIgnoredByGitOutput(".lexnet-data/store.json\n"), true);
  assert.equal(isPathIgnoredByGitOutput(""), false);
  assert.equal(isPathIgnoredByGitOutput("fatal: not a git repository\n"), false);
});

test("getGitIgnoreOutput checks the store path from the repository root", () => {
  assert.equal(isPathIgnoredByGitOutput(getGitIgnoreOutput(".lexnet-data/store.json")), true);
});

test("pilot prepare refuses production mode", () => {
  assert.equal(canRunPilotPrepare({ LEXNET_RUNTIME_MODE: "local-demo" }), true);
  assert.equal(canRunPilotPrepare({ LEXNET_RUNTIME_MODE: "pilot" }), true);
  assert.equal(canRunPilotPrepare({ LEXNET_RUNTIME_MODE: "production" }), false);
});

test("buildPilotSummary counts store records and GenLayer execution statuses", () => {
  const store = buildDemoPlatformStore();
  store.publishedPassports = store.publishedPassports.map((passport, index) => ({
    ...passport,
    status: index === 0 ? "published" : "draft",
  }));

  store.genLayerExecutions.push(
    {
      id: "submitted",
      caseId: "lx-demo-001",
      method: "verify_case",
      status: "submitted",
      contractAddress: "0x1111111111111111111111111111111111111111",
      rpcUrl: "https://studio.genlayer.com/api",
      networkLabel: "Studionet",
      submittedAt: "2026-05-13T00:00:00.000Z",
      blockingReasons: [],
    },
    {
      id: "state-verified",
      caseId: "lx-demo-002",
      method: "verify_case",
      status: "state_verified",
      contractAddress: "0x1111111111111111111111111111111111111111",
      rpcUrl: "https://studio.genlayer.com/api",
      networkLabel: "Studionet",
      submittedAt: "2026-05-13T00:00:00.000Z",
      blockingReasons: [],
    },
  );

  const summary = buildPilotSummary(store, { LEXNET_RUNTIME_MODE: "pilot" });

  assert.equal(summary.runtimeMode, "pilot");
  assert.equal(summary.caseCount, store.cases.length);
  assert.equal(summary.queueCount, store.queue.length);
  assert.equal(summary.publishedPassportCount, 1);
  assert.equal(summary.genLayerExecutionCounts.submitted, 1);
  assert.equal(summary.genLayerExecutionCounts.state_verified, 1);
  assert.match(summary.blockingReasons.join("\n"), /Local filesystem persistence is pilot infrastructure/);
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
  assert.equal(security.persistenceMode, "filesystem-local");
  assert.deepEqual(security.blockingReasons, [
    "Contract address is not configured.",
    "Wallet is not connected.",
    "Production authentication is not configured.",
  ]);
});

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
    createClient: ({ endpoint }) => ({
      writeContract: async (request) => {
        calls.push({ endpoint, request });
        return { transactionHash: "0xrealreceipt", status: "submitted" };
      },
    }),
  };

  const adapter = createGenLayerClientAdapter({ sdk, rpcUrl: "https://studio.genlayer.com/api" });
  const result = await adapter.verifyCase({
    contractAddress: "0xcontract",
    caseId: "lx-case-demo-settlement",
  });

  assert.equal(result.transactionHash, "0xrealreceipt");
  assert.equal(result.status, "submitted");
  assert.equal(calls.length, 1);
});

test("buildGenLayerGetCaseRequest maps LexNet get_case payload for genlayer-js", () => {
  const request = buildGenLayerGetCaseRequest({
    contractAddress: "0xcontract",
    caseId: "lx-case-demo-settlement",
  });

  assert.equal(request.contractAddress, "0xcontract");
  assert.equal(request.method, "get_case");
  assert.deepEqual(request.args, ["lx-case-demo-settlement"]);
});

test("createGenLayerClientAdapter reads contract case state through injected genlayer-js client", async () => {
  const sdk: GenLayerSdkModule = {
    createClient: ({ endpoint }) => ({
      readContract: async (request) => {
        assert.equal(endpoint, "https://studio.genlayer.com/api");
        assert.equal(request.functionName, "get_case");
        assert.deepEqual(request.args, ["lx-case-demo-settlement"]);
        return JSON.stringify({
          id: "lx-case-demo-settlement",
          status: "VERIFIED",
          verification_report: { verdict: "APPROVE", score: 95 },
        });
      },
    }),
  };

  const adapter = createGenLayerClientAdapter({ sdk, rpcUrl: "https://studio.genlayer.com/api" });
  const result = await adapter.readCase({
    contractAddress: "0xcontract",
    caseId: "lx-case-demo-settlement",
  });

  assert.equal(result.caseId, "lx-case-demo-settlement");
  assert.equal(result.parsedCase?.status, "VERIFIED");
});

test("classifyGenLayerCaseProof requires a verification report before state_verified", () => {
  assert.equal(
    classifyGenLayerCaseProof({ id: "lx-case-demo-settlement", status: "VERIFIED" }).status,
    "confirmed",
  );
  assert.equal(
    classifyGenLayerCaseProof({
      id: "lx-case-demo-settlement",
      status: "VERIFIED",
      verification_report: { verdict: "APPROVE" },
    }).status,
    "state_verified",
  );
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

test("buildGenLayerExecutionViewModel avoids settlement and payment finality labels", () => {
  const models = [
    buildGenLayerExecutionViewModel(null, true),
    buildGenLayerExecutionViewModel({ status: "submitted" } as GenLayerExecutionRecord, true),
    buildGenLayerExecutionViewModel({ status: "confirmed" } as GenLayerExecutionRecord, true),
    buildGenLayerExecutionViewModel({ status: "state_verified" } as GenLayerExecutionRecord, true),
    buildGenLayerExecutionViewModel(
      { status: "failed", sanitizedError: "boom" } as GenLayerExecutionRecord,
      true,
    ),
  ];
  const forbidden = /settled|paid|funds released|escrow completed|final on-chain settlement/i;

  for (const model of models) {
    assert.equal(forbidden.test(`${model.label} ${model.description}`), false);
  }
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

test("authorizeDemoPrivateApi rejects production demo-private mutation without production auth", () => {
  const request = new Request("http://localhost/api/passports", {
    method: "POST",
    headers: { "x-lexnet-operator-id": "operator-demo" },
  });
  const authorization = authorizeDemoPrivateApi(
    request,
    {
      LEXNET_RUNTIME_MODE: "production",
      LEXNET_ENABLE_DEMO_PRIVATE_API: "true",
    },
    createDefaultPlatformStore(),
  );

  assert.equal(authorization.authorized, false);
  if (!authorization.authorized) {
    assert.equal(authorization.response.status, 403);
  }
});

test("authorizeDemoPrivateApi allows production POST when production auth provider is configured", () => {
  const request = new Request("http://localhost/api/passports", {
    method: "POST",
    headers: { "x-lexnet-operator-id": "operator-demo" },
  });
  const authorization = authorizeDemoPrivateApi(
    request,
    {
      LEXNET_RUNTIME_MODE: "production",
      LEXNET_ENABLE_DEMO_PRIVATE_API: "true",
      LEXNET_PRODUCTION_AUTH_PROVIDER: "oauth-provider",
    },
    createDefaultPlatformStore(),
  );

  assert.equal(authorization.authorized, true);
});

test("authorizeDemoPrivateApi rejects missing bearer token when demo API token is configured", async () => {
  const request = new Request("https://lexnet.local/api/operators", {
    headers: { "x-lexnet-operator-id": "operator-demo" },
  });

  const result = authorizeDemoPrivateApi(
    request,
    {
      LEXNET_ENABLE_DEMO_PRIVATE_API: "true",
      LEXNET_DEMO_PRIVATE_API_TOKEN: "demo-token",
    },
    createDefaultPlatformStore(),
  );

  assert.equal(result.authorized, false);
  if (!result.authorized) {
    assert.equal(result.response.status, 401);
    assert.deepEqual(await result.response.json(), { error: "Unauthorized." });
  }
});

test("authorizeDemoPrivateApi accepts matching bearer token when demo API token is configured", () => {
  const request = new Request("https://lexnet.local/api/operators", {
    headers: {
      "x-lexnet-operator-id": "operator-demo",
      authorization: "Bearer demo-token",
    },
  });

  const result = authorizeDemoPrivateApi(
    request,
    {
      LEXNET_ENABLE_DEMO_PRIVATE_API: "true",
      LEXNET_DEMO_PRIVATE_API_TOKEN: "demo-token",
    },
    createDefaultPlatformStore(),
  );

  assert.equal(result.authorized, true);
});

test("authorizeDemoPrivateApi rejects mismatched bearer token when demo API token is configured", () => {
  const request = new Request("https://lexnet.local/api/operators", {
    headers: {
      "x-lexnet-operator-id": "operator-demo",
      authorization: "Bearer wrong-token",
    },
  });

  const result = authorizeDemoPrivateApi(
    request,
    {
      LEXNET_ENABLE_DEMO_PRIVATE_API: "true",
      LEXNET_DEMO_PRIVATE_API_TOKEN: "demo-token",
    },
    createDefaultPlatformStore(),
  );

  assert.equal(result.authorized, false);
});
