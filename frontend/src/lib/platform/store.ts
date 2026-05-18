import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { buildSubjectKey, findPublicPassport, redactSubject } from "./passports";
import type {
  DashboardQueueItem,
  GenLayerExecutionRecord,
  PlatformAuditEvent,
  PlatformAuditType,
  PlatformEntityType,
  PlatformStore,
  PlatformSummary,
  PublicPassportView,
  PublishedPassport,
} from "./types";
import type { CommerceCase } from "@/lib/lexnet-types";

export const DEFAULT_PLATFORM_STORE_PATH = join(
  process.cwd(),
  "..",
  ".lexnet-data",
  "store.json",
);

export interface PlatformStoreRepository {
  read(): Promise<PlatformStore>;
  write(store: PlatformStore): Promise<void>;
  mutate(mutate: (store: PlatformStore) => void | Promise<void>): Promise<PlatformStore>;
}

function shouldUsePostgres(env: Record<string, string | undefined> = process.env): boolean {
  return (
    env.LEXNET_MANAGED_PERSISTENCE_PROVIDER === "postgres" &&
    Boolean(env.LEXNET_MANAGED_DATABASE_URL)
  );
}

let cachedPostgresRepository: PlatformStoreRepository | undefined;

async function getPostgresRepository(): Promise<PlatformStoreRepository> {
  if (cachedPostgresRepository) return cachedPostgresRepository;
  const databaseUrl = process.env.LEXNET_MANAGED_DATABASE_URL!;
  const { createPostgresPlatformStoreRepository } = await import("./postgres-store");
  cachedPostgresRepository = createPostgresPlatformStoreRepository({ databaseUrl });
  return cachedPostgresRepository;
}

export function createDefaultPlatformStore(
  now = "2026-05-12T00:00:00.000Z",
): PlatformStore {
  return {
    version: 1,
    workspaces: [
      {
        id: "workspace-demo",
        name: "Demo Workspace",
        slug: "demo",
        createdAt: now,
        updatedAt: now,
      },
    ],
    operators: [
      {
        id: "operator-demo",
        name: "Demo Operator",
        walletAddress: "0x0000000000000000000000000000000000000000",
        email: "operator@lexnet.local",
        createdAt: now,
        updatedAt: now,
      },
    ],
    memberships: [
      {
        id: "membership-demo-owner",
        workspaceId: "workspace-demo",
        operatorId: "operator-demo",
        role: "owner",
        createdAt: now,
      },
    ],
    queue: [],
    cases: [],
    publishedPassports: [],
    auditEvents: [],
    genLayerExecutions: [],
  };
}

export async function readPlatformStore(
  storePath = DEFAULT_PLATFORM_STORE_PATH,
): Promise<PlatformStore> {
  if (shouldUsePostgres()) {
    const repo = await getPostgresRepository();
    return repo.read();
  }

  let raw: string;

  try {
    raw = await readFile(storePath, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      const store = createDefaultPlatformStore();
      await writePlatformStore(store, storePath);
      return store;
    }

    throw new Error(`Unable to read platform store at ${storePath}`, {
      cause: error,
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    throw new Error(`Invalid platform store JSON at ${storePath}`, {
      cause: error,
    });
  }

  if (!isPlatformStore(parsed)) {
    throw new Error(`Invalid platform store schema at ${storePath}`);
  }

  return parsed;
}

export async function writePlatformStore(
  store: PlatformStore,
  storePath = DEFAULT_PLATFORM_STORE_PATH,
): Promise<void> {
  if (shouldUsePostgres()) {
    const repo = await getPostgresRepository();
    return repo.write(store);
  }
  await mkdir(dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

let mutationQueue: Promise<void> = Promise.resolve();

export async function mutatePlatformStore(
  mutate: (store: PlatformStore) => void | Promise<void>,
  storePath = DEFAULT_PLATFORM_STORE_PATH,
): Promise<PlatformStore> {
  if (shouldUsePostgres()) {
    const repo = await getPostgresRepository();
    return repo.mutate(mutate);
  }

  const run = async () => {
    const store = await readPlatformStore(storePath);
    await mutate(store);
    await writePlatformStore(store, storePath);
    return store;
  };

  const queued = mutationQueue.then(run, run);
  mutationQueue = queued.then(
    () => undefined,
    () => undefined,
  );
  return queued;
}

export function createFilesystemPlatformStoreRepository(
  storePath = DEFAULT_PLATFORM_STORE_PATH,
): PlatformStoreRepository {
  return {
    read: () => readPlatformStore(storePath),
    write: (store) => writePlatformStore(store, storePath),
    mutate: (mutate) => mutatePlatformStore(mutate, storePath),
  };
}

export function createPlatformStoreRepository(
  env: Record<string, string | undefined> = process.env,
  storePath = DEFAULT_PLATFORM_STORE_PATH,
): PlatformStoreRepository {
  if (env.LEXNET_MANAGED_PERSISTENCE_PROVIDER === "postgres" && env.LEXNET_MANAGED_DATABASE_URL) {
    const databaseUrl = env.LEXNET_MANAGED_DATABASE_URL;
    return {
      read: async () => {
        const { createPostgresPlatformStoreRepository } = await import("./postgres-store");
        return createPostgresPlatformStoreRepository({ databaseUrl }).read();
      },
      write: async (store) => {
        const { createPostgresPlatformStoreRepository } = await import("./postgres-store");
        return createPostgresPlatformStoreRepository({ databaseUrl }).write(store);
      },
      mutate: async (mutate) => {
        const { createPostgresPlatformStoreRepository } = await import("./postgres-store");
        return createPostgresPlatformStoreRepository({ databaseUrl }).mutate(mutate);
      },
    };
  }

  if (env.LEXNET_RUNTIME_MODE === "production") {
    throw new Error("Managed persistence is required in production.");
  }

  return createFilesystemPlatformStoreRepository(storePath);
}

export async function appendAuditEvent(
  input: {
    type: PlatformAuditType;
    actorId: string;
    entityType: PlatformEntityType;
    entityId: string;
    detail: string;
  },
  storePath = DEFAULT_PLATFORM_STORE_PATH,
  createdAt = new Date().toISOString(),
): Promise<PlatformAuditEvent> {
  const event: PlatformAuditEvent = {
    id: `audit-${createdAt.replace(/\D/g, "")}-${input.type.replace(/\./g, "-")}`,
    ...input,
    createdAt,
  };

  await mutatePlatformStore((store) => {
    store.auditEvents.push(event);
  }, storePath);

  return event;
}

export async function appendGenLayerExecution(
  execution: GenLayerExecutionRecord,
  storePath = DEFAULT_PLATFORM_STORE_PATH,
): Promise<GenLayerExecutionRecord> {
  await mutatePlatformStore((store) => {
    store.genLayerExecutions.push(execution);
  }, storePath);

  return execution;
}

export async function updateLatestGenLayerExecutionProof(
  caseId: string,
  update: Pick<
    GenLayerExecutionRecord,
    "status" | "checkedAt" | "proof" | "sanitizedError"
  >,
  storePath = DEFAULT_PLATFORM_STORE_PATH,
): Promise<GenLayerExecutionRecord | null> {
  let updated: GenLayerExecutionRecord | null = null;

  await mutatePlatformStore((store) => {
    for (let index = store.genLayerExecutions.length - 1; index >= 0; index -= 1) {
      const execution = store.genLayerExecutions[index];
      if (execution.caseId === caseId && execution.method === "verify_case") {
        store.genLayerExecutions[index] = { ...execution, ...update };
        updated = store.genLayerExecutions[index];
        break;
      }
    }
  }, storePath);

  return updated;
}

export function buildPlatformSummary(store: PlatformStore): PlatformSummary {
  return {
    workspaceCount: store.workspaces.length,
    operatorCount: store.operators.length,
    queueCount: store.queue.length,
    caseCount: store.cases.length,
    publishedPassportCount: store.publishedPassports.length,
    auditEventCount: store.auditEvents.length,
  };
}

export type DashboardPlatformData = {
  cases: CommerceCase[];
  platformSummary?: PlatformSummary;
  queueItems: DashboardQueueItem[];
  backendStoreStatus: "available" | "unavailable";
};

export type SafePassportRecord = ReturnType<typeof toSafePassportRecord>;

export function mergePlatformCommerceCases(
  seedCases: CommerceCase[],
  storeCases: CommerceCase[],
): CommerceCase[] {
  const byId = new Map<string, CommerceCase>();

  for (const commerceCase of seedCases) {
    byId.set(commerceCase.id, commerceCase);
  }

  for (const commerceCase of storeCases) {
    byId.set(commerceCase.id, commerceCase);
  }

  return Array.from(byId.values()).sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

export function selectPrimaryPlatformCommerceCases(
  seedCases: CommerceCase[],
  storeCases: CommerceCase[],
): CommerceCase[] {
  const sourceCases = storeCases.length > 0 ? storeCases : seedCases;
  return [...sourceCases].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

export function toDashboardQueueItems(
  queueItems: PlatformStore["queue"],
): DashboardQueueItem[] {
  return queueItems.map((item) => ({
    id: item.id,
    caseId: item.caseId,
    status: item.status,
    priority: item.priority,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
}

export async function getDashboardPlatformData(
  seedCases: CommerceCase[],
  storePath = DEFAULT_PLATFORM_STORE_PATH,
): Promise<DashboardPlatformData> {
  try {
    const store = await readPlatformStore(storePath);

    return {
      cases: selectPrimaryPlatformCommerceCases(seedCases, store.cases),
      platformSummary: buildPlatformSummary(store),
      queueItems: toDashboardQueueItems(store.queue),
      backendStoreStatus: "available",
    };
  } catch {
    return {
      cases: [...seedCases],
      queueItems: [],
      backendStoreStatus: "unavailable",
    };
  }
}

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

export async function getPlatformCommerceCases(
  seedCases: CommerceCase[],
  storePath = DEFAULT_PLATFORM_STORE_PATH,
): Promise<CommerceCase[]> {
  try {
    const store = await readPlatformStore(storePath);
    return mergePlatformCommerceCases(seedCases, store.cases);
  } catch {
    return [...seedCases].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    );
  }
}

export async function getSafePassportRecords(
  storePath = DEFAULT_PLATFORM_STORE_PATH,
): Promise<SafePassportRecord[]> {
  try {
    const store = await readPlatformStore(storePath);
    return toSafePassportRecords(store.publishedPassports).passports;
  } catch {
    return [];
  }
}

export function toSafePassportRecords(passports: PublishedPassport[]) {
  const records = passports.map(toSafePassportRecord);

  return {
    passports: records,
    count: records.length,
  };
}

export async function getPublicPassportView(
  slug: string,
  storePath = DEFAULT_PLATFORM_STORE_PATH,
): Promise<PublicPassportView | null> {
  try {
    const store = await readPlatformStore(storePath);
    return findPublicPassport(store.publishedPassports, slug);
  } catch {
    return null;
  }
}

export function toSafePassportRecord(passport: PublishedPassport) {
  return {
    id: passport.id,
    slug: passport.slug,
    subjectKey: buildSubjectKey(passport.role, passport.party),
    redactedSubject: redactSubject(passport.party),
    role: passport.role,
    trustLevel: passport.trustLevel,
    averageScore: passport.averageScore,
    totalCases: passport.totalCases,
    verifiedCases: passport.verifiedCases,
    totalReferencedValue: passport.totalReferencedValue,
    sourceReportCount: passport.caseIds.length,
    riskFlags: [...passport.riskFlags],
    published: Boolean(passport.publishedAt),
    publishedAt: passport.publishedAt,
    updatedAt: passport.updatedAt,
  };
}

export function isPlatformStore(value: unknown): value is PlatformStore {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.version === 1 &&
    Array.isArray(value.workspaces) &&
    value.workspaces.every(isPlatformWorkspace) &&
    Array.isArray(value.operators) &&
    value.operators.every(isPlatformOperator) &&
    Array.isArray(value.memberships) &&
    value.memberships.every(isPlatformMembership) &&
    Array.isArray(value.queue) &&
    value.queue.every(isPlatformQueueItem) &&
    Array.isArray(value.cases) &&
    value.cases.every(isCommerceCase) &&
    Array.isArray(value.publishedPassports) &&
    value.publishedPassports.every(isPublishedPassport) &&
    Array.isArray(value.auditEvents) &&
    value.auditEvents.every(isPlatformAuditEvent) &&
    Array.isArray(value.genLayerExecutions) &&
    value.genLayerExecutions.every(isGenLayerExecutionRecord)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || isString(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isPlatformWorkspace(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.name) &&
    isString(value.slug) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

function isPlatformOperator(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.name) &&
    isString(value.walletAddress) &&
    isOptionalString(value.email) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

function isPlatformMembership(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.workspaceId) &&
    isString(value.operatorId) &&
    ["owner", "admin", "operator", "viewer"].includes(String(value.role)) &&
    isString(value.createdAt)
  );
}

function isPlatformQueueItem(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.workspaceId) &&
    isString(value.caseId) &&
    ["pending", "in_review", "completed", "blocked"].includes(String(value.status)) &&
    ["low", "normal", "high"].includes(String(value.priority)) &&
    isOptionalString(value.assignedOperatorId) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
  );
}

function isCommerceCase(value: unknown): value is CommerceCase {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.title) &&
    isString(value.buyer) &&
    isString(value.seller) &&
    isString(value.agreementText) &&
    isStringArray(value.acceptanceCriteria) &&
    isNumber(value.amountReference) &&
    [
      "DRAFT",
      "ACTIVE",
      "EVIDENCE_SUBMITTED",
      "UNDER_AI_REVIEW",
      "VERIFIED",
      "REVISION_REQUESTED",
      "DISPUTED",
      "SETTLEMENT_RECOMMENDED",
    ].includes(String(value.status)) &&
    Array.isArray(value.evidence) &&
    value.evidence.every(isEvidenceItem) &&
    (value.verificationReport === null || isVerificationReport(value.verificationReport)) &&
    isString(value.createdAt)
  );
}

function isEvidenceItem(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.url) &&
    ["web", "repository", "document"].includes(String(value.resourceType)) &&
    isString(value.checksum)
  );
}

function isVerificationReport(value: unknown): boolean {
  return (
    isRecord(value) &&
    ["APPROVE", "REVISE", "REJECT", "SPLIT_RECOMMENDED"].includes(String(value.verdict)) &&
    isNumber(value.score) &&
    isString(value.summary) &&
    isString(value.recommendation) &&
    isNumber(value.sellerShareBps) &&
    isString(value.reviewedAt) &&
    (value.riskFlags === undefined || isStringArray(value.riskFlags)) &&
    (value.source === undefined || ["local", "genlayer-contract"].includes(String(value.source)))
  );
}

function isPublishedPassport(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.slug) &&
    isString(value.workspaceId) &&
    ["draft", "published"].includes(String(value.status)) &&
    isString(value.party) &&
    ["buyer", "seller"].includes(String(value.role)) &&
    ["Established", "Reliable", "Developing", "At Risk"].includes(String(value.trustLevel)) &&
    isNumber(value.totalCases) &&
    isNumber(value.verifiedCases) &&
    isNumber(value.averageScore) &&
    isNumber(value.totalReferencedValue) &&
    isStringArray(value.riskFlags) &&
    isStringArray(value.caseIds) &&
    isString(value.publishedAt) &&
    isString(value.updatedAt)
  );
}

function isPlatformAuditEvent(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.id) &&
    [
      "case.created",
      "evidence.submitted",
      "verification.generated",
      "passport.generated",
      "passport.published",
      "passport.unpublished",
      "backup.exported",
      "production.auth.accepted",
      "production.auth.rejected",
      "production.persistence.selected",
      "evidence.retention.applied",
    ].includes(String(value.type)) &&
    isString(value.actorId) &&
    ["case", "evidence", "report", "passport", "workspace", "backup"].includes(String(value.entityType)) &&
    isString(value.entityId) &&
    isString(value.detail) &&
    isString(value.createdAt)
  );
}

function isGenLayerExecutionRecord(value: unknown): value is GenLayerExecutionRecord {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.caseId) &&
    value.method === "verify_case" &&
    ["submitted", "confirmed", "failed", "state_verified"].includes(String(value.status)) &&
    isOptionalString(value.transactionHash) &&
    isString(value.contractAddress) &&
    isString(value.rpcUrl) &&
    isString(value.networkLabel) &&
    isString(value.submittedAt) &&
    isOptionalString(value.checkedAt) &&
    isStringArray(value.blockingReasons) &&
    isOptionalString(value.sanitizedError) &&
    (value.proof === undefined || isGenLayerExecutionProof(value.proof))
  );
}

function isGenLayerExecutionProof(value: unknown): boolean {
  return (
    isRecord(value) &&
    isOptionalString(value.contractCaseStatus) &&
    (value.verificationReport === undefined || value.verificationReport !== null)
  );
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
