import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  address: text("address").notNull(),
  createdAt: text("created_at").notNull(),
});

export const cases = sqliteTable("cases", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  client: text("client").notNull(),
  freelancer: text("freelancer").notNull(),
  requirementsText: text("requirements_text").notNull(),
  amount: text("amount").notNull().default("0"),
  feeAmount: text("fee_amount").notNull().default("0"),
  status: text("status").notNull().default("CREATED"),
  submittedWorkUrl: text("submitted_work_url").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  resolvedAt: text("resolved_at").notNull().default(""),
});

export const evidence = sqliteTable("evidence", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  workspaceId: text("workspace_id").notNull(),
  submittedBy: text("submitted_by").notNull(),
  url: text("url").notNull(),
  normalizedUrl: text("normalized_url").notNull(),
  status: text("status").notNull().default("pending"),
  checksum: text("checksum").notNull(),
  createdAt: text("created_at").notNull(),
});

export const reports = sqliteTable("reports", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  workspaceId: text("workspace_id").notNull(),
  version: text("version").notNull().default("lexnet.report.v1"),
  schemaVersion: integer("schema_version").notNull().default(1),
  status: text("status").notNull().default("draft"),
  evidenceIds: text("evidence_ids").notNull().default("[]"),
  evidenceChecksums: text("evidence_checksums").notNull().default("[]"),
  verdict: text("verdict").notNull().default("rejected"),
  impactScore: integer("impact_score").notNull().default(0),
  settlementRecommendation: text("settlement_recommendation").notNull().default("refund_client"),
  rationale: text("rationale").notNull().default(""),
  reviewerNotes: text("reviewer_notes").notNull().default(""),
  exportedAt: text("exported_at").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  caseId: text("case_id"),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  payload: text("payload").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
});

export const passports = sqliteTable("passports", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  subject: text("subject").notNull(),
  publicSlug: text("public_slug").notNull(),
  redactedSubject: text("redacted_subject").notNull(),
  score: integer("score").notNull().default(0),
  scoreBreakdown: text("score_breakdown").notNull().default("{}"),
  sourceReportIds: text("source_report_ids").notNull().default("[]"),
  status: text("status").notNull().default("private"),
  updatedAt: text("updated_at").notNull(),
});

export const memberships = sqliteTable("memberships", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role").notNull().default("viewer"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
});

export const invitations = sqliteTable("invitations", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("viewer"),
  status: text("status").notNull().default("pending"),
  token: text("token").notNull(),
  createdAt: text("created_at").notNull(),
});

export const assignments = sqliteTable("assignments", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  caseId: text("case_id").notNull(),
  operatorId: text("operator_id").notNull(),
  queue: text("queue").notNull().default("intake"),
  status: text("status").notNull().default("open"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const queue = sqliteTable("queue", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  caseId: text("case_id").notNull(),
  priority: text("priority").notNull().default("normal"),
  status: text("status").notNull().default("waiting"),
  createdAt: text("created_at").notNull(),
});

export const demoAccounts = sqliteTable("demo_accounts", {
  id: text("id").primaryKey(),
  label: text("label").notNull().default(""),
  address: text("address").notNull(),
  privateKeyRef: text("private_key_ref").notNull(),
  createdAt: text("created_at").notNull(),
});

export const analyticsEvents = sqliteTable("analytics_events", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  name: text("name").notNull(),
  count: integer("count").notNull().default(0),
  updatedAt: text("updated_at").notNull(),
});
