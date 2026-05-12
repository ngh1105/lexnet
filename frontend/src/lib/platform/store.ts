import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type {
  PlatformAuditEvent,
  PlatformAuditType,
  PlatformEntityType,
  PlatformStore,
  PlatformSummary,
} from "./types";

export const DEFAULT_PLATFORM_STORE_PATH = join(
  process.cwd(),
  "..",
  ".lexnet-data",
  "store.json",
);

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
  };
}

export async function readPlatformStore(
  storePath = DEFAULT_PLATFORM_STORE_PATH,
): Promise<PlatformStore> {
  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (isPlatformStore(parsed)) {
      return parsed;
    }
  } catch {
    // Missing, unreadable, or invalid stores are replaced with a default store.
  }

  const store = createDefaultPlatformStore();
  await writePlatformStore(store, storePath);
  return store;
}

export async function writePlatformStore(
  store: PlatformStore,
  storePath = DEFAULT_PLATFORM_STORE_PATH,
): Promise<void> {
  await mkdir(dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export async function mutatePlatformStore(
  mutate: (store: PlatformStore) => void | Promise<void>,
  storePath = DEFAULT_PLATFORM_STORE_PATH,
): Promise<PlatformStore> {
  const store = await readPlatformStore(storePath);
  await mutate(store);
  await writePlatformStore(store, storePath);
  return store;
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

function isPlatformStore(value: unknown): value is PlatformStore {
  if (!value || typeof value !== "object") {
    return false;
  }

  const store = value as Partial<Record<keyof PlatformStore, unknown>>;
  return (
    store.version === 1 &&
    Array.isArray(store.workspaces) &&
    Array.isArray(store.operators) &&
    Array.isArray(store.memberships) &&
    Array.isArray(store.queue) &&
    Array.isArray(store.cases) &&
    Array.isArray(store.publishedPassports) &&
    Array.isArray(store.auditEvents)
  );
}
