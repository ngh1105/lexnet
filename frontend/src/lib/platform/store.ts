import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { AuditEvent, PlatformStore } from "./types";

const DATA_DIR = path.join(process.cwd(), ".lexnet-data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

const now = () => new Date().toISOString();

const defaultStore = (): PlatformStore => ({
  workspaces: [{ id: "default", name: "Default Workspace", createdAt: now() }],
  users: [],
  cases: [],
  evidence: [],
  reports: [],
  auditEvents: [],
  passports: [],
  memberships: [],
  invitations: [],
  assignments: [],
  queue: [],
  demoAccounts: [],
  analyticsEvents: [],
  backups: [],
  security: { rateLimits: [], incidents: [], envValidatedAt: "", lastBackupAt: "" },
});

export function migrateStore(input: Partial<PlatformStore>): PlatformStore {
  const migrated = { ...defaultStore(), ...input } as PlatformStore;
  migrated.demoAccounts = (migrated.demoAccounts || []).map((account) => ({
    id: account.id,
    label: account.label,
    address: account.address,
    privateKeyRef: account.privateKeyRef,
    createdAt: account.createdAt,
  }));
  return migrated;
}

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export function checksum(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function normalizeEvidenceUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase();
  parsed.pathname = parsed.pathname.replace(/\/$/, "");
  return parsed.toString();
}

export async function readStore(): Promise<PlatformStore> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    return migrateStore(JSON.parse(raw) as Partial<PlatformStore>);
  } catch {
    const store = defaultStore();
    await writeStore(store);
    return store;
  }
}

export async function writeStore(store: PlatformStore): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

export async function appendAuditEvent(
  store: PlatformStore,
  event: Omit<AuditEvent, "id" | "createdAt">
): Promise<AuditEvent> {
  const auditEvent: AuditEvent = {
    ...event,
    id: createId("audit"),
    createdAt: now(),
  };
  store.auditEvents.push(auditEvent);
  return auditEvent;
}

export { now };
