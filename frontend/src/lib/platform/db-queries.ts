import { getDb } from "./db";
import * as schema from "./schema";
import type { PlatformStore, AuditEvent } from "./types";
import { createId, now } from "./store";

function parseJson<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val) as T; } catch { return fallback; }
}

function hydrateStore(rows: {
  workspaces: any[];
  users: any[];
  cases: any[];
  evidence: any[];
  reports: any[];
  auditEvents: any[];
  passports: any[];
  memberships: any[];
  invitations: any[];
  assignments: any[];
  queue: any[];
  demoAccounts: any[];
  analyticsEvents: any[];
}): PlatformStore {
  return {
    workspaces: rows.workspaces,
    users: rows.users,
    cases: rows.cases,
    evidence: rows.evidence,
    reports: rows.reports.map((r: any) => ({
      ...r,
      evidenceIds: parseJson<string[]>(r.evidenceIds, []),
      evidenceChecksums: parseJson<string[]>(r.evidenceChecksums, []),
    })),
    auditEvents: rows.auditEvents.map((r: any) => ({
      ...r,
      caseId: r.caseId ?? undefined,
      payload: parseJson<Record<string, unknown>>(r.payload, {}),
    })),
    passports: rows.passports.map((r: any) => ({
      ...r,
      scoreBreakdown: parseJson(r.scoreBreakdown, { avgImpact: 0, completionRate: 0, approvalRate: 0, resolvedCases: 0 }),
      sourceReportIds: parseJson<string[]>(r.sourceReportIds, []),
    })),
    memberships: rows.memberships,
    invitations: rows.invitations,
    assignments: rows.assignments,
    queue: rows.queue,
    demoAccounts: rows.demoAccounts,
    analyticsEvents: rows.analyticsEvents,
    backups: [],
    security: { rateLimits: [], incidents: [], envValidatedAt: "", lastBackupAt: "" },
  };
}

export function readStoreFromDb(): PlatformStore {
  const db = getDb();
  return hydrateStore({
    workspaces: db.select().from(schema.workspaces).all(),
    users: db.select().from(schema.users).all(),
    cases: db.select().from(schema.cases).all(),
    evidence: db.select().from(schema.evidence).all(),
    reports: db.select().from(schema.reports).all(),
    auditEvents: db.select().from(schema.auditEvents).all(),
    passports: db.select().from(schema.passports).all(),
    memberships: db.select().from(schema.memberships).all(),
    invitations: db.select().from(schema.invitations).all(),
    assignments: db.select().from(schema.assignments).all(),
    queue: db.select().from(schema.queue).all(),
    demoAccounts: db.select().from(schema.demoAccounts).all(),
    analyticsEvents: db.select().from(schema.analyticsEvents).all(),
  });
}

export function writeStoreToDb(store: PlatformStore): void {
  const db = getDb();
  const sqlite = (db as any).$client;

  sqlite.exec("BEGIN");
  try {
    const upsert = (table: any, rows: any[], serialize?: (r: any) => any) => {
      for (const row of rows) {
        const values = serialize ? { ...row, ...serialize(row) } : row;
        db.insert(table).values(values).onConflictDoUpdate({ target: table.id, set: values }).run();
      }
    };

    upsert(schema.workspaces, store.workspaces);
    upsert(schema.users, store.users);
    upsert(schema.cases, store.cases);
    upsert(schema.evidence, store.evidence);
    upsert(schema.reports, store.reports, (r) => ({
      evidenceIds: JSON.stringify(r.evidenceIds),
      evidenceChecksums: JSON.stringify(r.evidenceChecksums),
    }));
    upsert(schema.auditEvents, store.auditEvents as any, (r) => ({
      caseId: r.caseId ?? null,
      payload: JSON.stringify(r.payload),
    }));
    upsert(schema.passports, store.passports as any, (r) => ({
      scoreBreakdown: JSON.stringify(r.scoreBreakdown),
      sourceReportIds: JSON.stringify(r.sourceReportIds),
    }));
    upsert(schema.memberships, store.memberships);
    upsert(schema.invitations, store.invitations);
    upsert(schema.assignments, store.assignments);
    upsert(schema.queue, store.queue);
    upsert(schema.demoAccounts, store.demoAccounts);
    upsert(schema.analyticsEvents, store.analyticsEvents);

    sqlite.exec("COMMIT");
  } catch (err) {
    sqlite.exec("ROLLBACK");
    throw err;
  }
}

export function appendAuditEventToDb(
  store: PlatformStore,
  event: Omit<AuditEvent, "id" | "createdAt">,
): AuditEvent {
  const auditEvent: AuditEvent = {
    ...event,
    id: createId("audit"),
    createdAt: now(),
  };
  store.auditEvents.push(auditEvent);

  const db = getDb();
  db.insert(schema.auditEvents).values({
    ...auditEvent,
    caseId: auditEvent.caseId ?? null,
    payload: JSON.stringify(auditEvent.payload),
  }).run();

  return auditEvent;
}
