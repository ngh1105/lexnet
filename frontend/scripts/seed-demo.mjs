import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { createAccount } from "genlayer-js";

const now = () => new Date().toISOString();
const id = (prefix) => `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
const checksum = (input) => crypto.createHash("sha256").update(input).digest("hex");
const normalize = (url) => {
  const parsed = new URL(url);
  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase();
  parsed.pathname = parsed.pathname.replace(/\/$/, "");
  return parsed.toString();
};
const account = createAccount();
const client = createAccount();
const freelancer = createAccount();
const timestamp = now();
const workspace = { id: "default", name: "Default Workspace", createdAt: timestamp };
const demoAccount = { id: id("acct"), label: "LexNet Demo Operator", address: account.address.toLowerCase(), privateKeyRef: `local-demo:${checksum(account.address).slice(0, 16)}`, createdAt: timestamp };
const caseItem = { id: id("case"), workspaceId: workspace.id, client: client.address.toLowerCase(), freelancer: freelancer.address.toLowerCase(), requirementsText: "Pilot launch package with responsive dashboard, audit log, report export, and public trust passport.", amount: "2500000000000000000", feeAmount: "62500000000000000", status: "RESOLVED", submittedWorkUrl: "https://github.com/lexnet/demo-pilot", createdAt: timestamp, updatedAt: timestamp, resolvedAt: timestamp };
const normalizedUrl = normalize(caseItem.submittedWorkUrl);
const evidence = { id: id("ev"), caseId: caseItem.id, workspaceId: workspace.id, submittedBy: caseItem.freelancer, url: caseItem.submittedWorkUrl, normalizedUrl, status: "verified", checksum: checksum(normalizedUrl), createdAt: timestamp };
const report = { id: id("report"), caseId: caseItem.id, workspaceId: workspace.id, version: "lexnet.report.v1", schemaVersion: 1, status: "reviewed", evidenceIds: [evidence.id], evidenceChecksums: [evidence.checksum], verdict: "approved", impactScore: 88, settlementRecommendation: "release_to_freelancer", rationale: "Demo verification confirms the pilot deliverables meet the stored requirements.", reviewerNotes: "Seeded demo report reviewed for pilot walkthrough.", exportedAt: "", createdAt: timestamp };
const passport = { id: id("passport"), workspaceId: workspace.id, subject: caseItem.freelancer, publicSlug: checksum(`${workspace.id}:${caseItem.freelancer}`).slice(0, 16), redactedSubject: `${caseItem.freelancer.slice(0, 6)}...${caseItem.freelancer.slice(-4)}`, score: 88, scoreBreakdown: { avgImpact: 88, completionRate: 100, approvalRate: 100, resolvedCases: 1 }, sourceReportIds: [report.id], status: "published", updatedAt: timestamp };
const audit = ["case.created", "case.funded", "evidence.submitted", "verification.completed", "report.reviewed", "passport.published", "demo.account.generated"].map((action) => ({ id: id("audit"), workspaceId: workspace.id, caseId: action.includes("passport") || action.includes("demo") ? undefined : caseItem.id, actor: demoAccount.address, action, payload: { demo: true }, createdAt: timestamp }));
const store = {
  workspaces: [workspace],
  users: [{ id: id("user"), address: demoAccount.address, createdAt: timestamp }, { id: id("user"), address: client.address.toLowerCase(), createdAt: timestamp }, { id: id("user"), address: freelancer.address.toLowerCase(), createdAt: timestamp }],
  cases: [caseItem],
  evidence: [evidence],
  reports: [report],
  auditEvents: audit,
  passports: [passport],
  memberships: [{ id: id("member"), workspaceId: workspace.id, userId: demoAccount.address, role: "admin", status: "active", createdAt: timestamp }],
  invitations: [{ id: id("invite"), workspaceId: workspace.id, email: "pilot@lexnet.local", role: "reviewer", status: "pending", token: id("token"), createdAt: timestamp }],
  assignments: [{ id: id("assign"), workspaceId: workspace.id, caseId: caseItem.id, operatorId: demoAccount.address, queue: "resolved", status: "done", createdAt: timestamp, updatedAt: timestamp }],
  queue: [{ id: id("queue"), workspaceId: workspace.id, caseId: caseItem.id, priority: "high", status: "closed", createdAt: timestamp }],
  demoAccounts: [demoAccount],
  analyticsEvents: audit.reduce((acc, event) => ({ ...acc, [event.action]: { id: id("metric"), workspaceId: workspace.id, name: event.action, count: 1, updatedAt: timestamp } }), {}),
  backups: [],
  security: { rateLimits: [], incidents: [], envValidatedAt: timestamp, lastBackupAt: "" },
};
store.analyticsEvents = Object.values(store.analyticsEvents);
const dataDir = path.join(process.cwd(), ".lexnet-data");
await mkdir(dataDir, { recursive: true });
await writeFile(path.join(dataDir, "store.json"), JSON.stringify(store, null, 2), "utf8");
console.log(JSON.stringify({ caseId: caseItem.id, passportSlug: passport.publicSlug, demoAccount: demoAccount.address, privateKeyRef: demoAccount.privateKeyRef }, null, 2));
