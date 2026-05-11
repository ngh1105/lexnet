import { createAccount } from "genlayer-js";
import { appendAuditEvent, checksum, createId, now, readStore, writeStore } from "./store";
import type { PlatformStore, TrustPassport } from "./types";

export function ensurePlatformDefaults(store: PlatformStore): void {
  const timestamp = now();
  store.workspaces ||= [];
  store.users ||= [];
  store.cases ||= [];
  store.evidence ||= [];
  store.reports ||= [];
  store.auditEvents ||= [];
  store.passports ||= [];
  store.memberships ||= [];
  store.invitations ||= [];
  store.assignments ||= [];
  store.queue ||= [];
  store.demoAccounts ||= [];
  store.analyticsEvents ||= [];
  store.backups ||= [];
  store.security ||= { rateLimits: [], incidents: [], envValidatedAt: "", lastBackupAt: "" };
  if (!store.workspaces.some((entry) => entry.id === "default")) {
    store.workspaces.push({ id: "default", name: "Default Workspace", createdAt: timestamp });
  }
}

export function redactSubject(subject: string): string {
  if (!subject) return "unknown";
  if (subject.startsWith("0x") && subject.length > 10) return `${subject.slice(0, 6)}...${subject.slice(-4)}`;
  const [name, domain] = subject.split("@");
  if (domain) return `${name.slice(0, 2)}***@${domain}`;
  return subject.length > 8 ? `${subject.slice(0, 4)}...${subject.slice(-3)}` : subject;
}

export function buildPassport(store: PlatformStore, workspaceId: string, subject: string): TrustPassport {
  ensurePlatformDefaults(store);
  const subjectCases = store.cases.filter((entry) => entry.workspaceId === workspaceId && [entry.client, entry.freelancer].includes(subject));
  const resolved = subjectCases.filter((entry) => entry.status === "RESOLVED");
  const reportIds = store.reports.filter((report) => resolved.some((entry) => entry.id === report.caseId)).map((report) => report.id);
  const approved = store.reports.filter((report) => reportIds.includes(report.id) && report.verdict === "approved").length;
  const avgImpact = reportIds.length
    ? Math.round(store.reports.filter((report) => reportIds.includes(report.id)).reduce((sum, report) => sum + report.impactScore, 0) / reportIds.length)
    : 0;
  const completionRate = subjectCases.length ? Math.round((resolved.length / subjectCases.length) * 100) : 0;
  const approvalRate = reportIds.length ? Math.round((approved / reportIds.length) * 100) : 0;
  const score = Math.round(avgImpact * 0.5 + completionRate * 0.3 + approvalRate * 0.2);
  const existing = store.passports.find((entry) => entry.workspaceId === workspaceId && entry.subject === subject);

  return {
    id: existing?.id || createId("passport"),
    workspaceId,
    subject,
    publicSlug: existing?.publicSlug || checksum(`${workspaceId}:${subject}`).slice(0, 16),
    redactedSubject: redactSubject(subject),
    score,
    scoreBreakdown: { avgImpact, completionRate, approvalRate, resolvedCases: resolved.length },
    sourceReportIds: reportIds,
    status: "published",
    updatedAt: now(),
  };
}

export async function ensureDemoAccount(label = "LexNet Demo Operator") {
  const store = await readStore();
  ensurePlatformDefaults(store);
  const existing = store.demoAccounts.find((entry) => entry.label === label);
  if (existing) return existing;
  const account = createAccount();
  const demoAccount = {
    id: createId("acct"),
    label,
    address: account.address.toLowerCase(),
    privateKeyRef: `local-demo:${checksum(`${account.address}:${label}`).slice(0, 16)}`,
    createdAt: now(),
  };
  store.demoAccounts.push(demoAccount);
  store.users.push({ id: createId("user"), address: demoAccount.address, createdAt: demoAccount.createdAt });
  store.memberships.push({ id: createId("member"), workspaceId: "default", userId: demoAccount.address, role: "admin", status: "active", createdAt: demoAccount.createdAt });
  await appendAuditEvent(store, { workspaceId: "default", actor: demoAccount.address, action: "demo.account.generated", payload: { address: demoAccount.address, privateKeyRef: demoAccount.privateKeyRef } });
  await writeStore(store);
  return demoAccount;
}
