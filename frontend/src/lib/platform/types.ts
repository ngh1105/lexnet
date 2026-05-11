export type PlatformCaseStatus = "CREATED" | "FUNDED" | "WORK_SUBMITTED" | "AI_EVALUATING" | "RESOLVED";

export interface PlatformCase {
  id: string;
  workspaceId: string;
  client: string;
  freelancer: string;
  requirementsText: string;
  amount: string;
  feeAmount: string;
  status: PlatformCaseStatus;
  submittedWorkUrl: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string;
}

export interface EvidenceRecord {
  id: string;
  caseId: string;
  workspaceId: string;
  submittedBy: string;
  url: string;
  normalizedUrl: string;
  status: "pending" | "reachable" | "unreachable" | "stale" | "verified";
  checksum: string;
  createdAt: string;
}

export interface VerificationReport {
  id: string;
  caseId: string;
  workspaceId: string;
  version: "lexnet.report.v1";
  schemaVersion: 1;
  status: "draft" | "reviewed" | "exported";
  evidenceIds: string[];
  evidenceChecksums: string[];
  verdict: "approved" | "rejected";
  impactScore: number;
  settlementRecommendation: "release_to_freelancer" | "refund_client";
  rationale: string;
  reviewerNotes: string;
  exportedAt: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  workspaceId: string;
  caseId?: string;
  actor: string;
  action: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export type WorkspaceRole = "admin" | "operator" | "reviewer" | "viewer";

export interface WorkspaceMembership {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  status: "active" | "suspended";
  createdAt: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  status: "pending" | "accepted" | "revoked";
  token: string;
  createdAt: string;
}

export interface CaseAssignment {
  id: string;
  workspaceId: string;
  caseId: string;
  operatorId: string;
  queue: "intake" | "review" | "resolved";
  status: "open" | "in_progress" | "done";
  createdAt: string;
  updatedAt: string;
}

export interface TrustPassport {
  id: string;
  workspaceId: string;
  subject: string;
  publicSlug: string;
  redactedSubject: string;
  score: number;
  scoreBreakdown: { avgImpact: number; completionRate: number; approvalRate: number; resolvedCases: number };
  sourceReportIds: string[];
  status: "private" | "published";
  updatedAt: string;
}

export interface DemoAccount {
  id: string;
  label: string;
  address: string;
  privateKeyRef: string;
  createdAt: string;
}

export interface PlatformStore {
  workspaces: Array<{ id: string; name: string; createdAt: string }>;
  users: Array<{ id: string; address: string; createdAt: string }>;
  cases: PlatformCase[];
  evidence: EvidenceRecord[];
  reports: VerificationReport[];
  auditEvents: AuditEvent[];
  passports: TrustPassport[];
  memberships: WorkspaceMembership[];
  invitations: WorkspaceInvitation[];
  assignments: CaseAssignment[];
  queue: Array<{ id: string; workspaceId: string; caseId: string; priority: "low" | "normal" | "high"; status: "waiting" | "assigned" | "closed"; createdAt: string }>;
  demoAccounts: DemoAccount[];
  analyticsEvents: Array<{ id: string; workspaceId: string; name: string; count: number; updatedAt: string }>;
  backups: Array<{ id: string; path: string; checksum: string; createdAt: string }>;
  security: { rateLimits: Array<{ key: string; count: number; resetAt: string }>; incidents: Array<{ id: string; severity: "low" | "medium" | "high"; title: string; status: "open" | "closed"; createdAt: string }>; envValidatedAt: string; lastBackupAt: string };
}
