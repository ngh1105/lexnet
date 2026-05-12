import type {
  CommerceCase,
  TrustPassportLevel,
  TrustPassportRole,
} from "@/lib/lexnet-types";

export type PlatformAuditType =
  | "case.created"
  | "evidence.submitted"
  | "verification.generated"
  | "passport.generated"
  | "passport.published"
  | "passport.unpublished"
  | "backup.exported";

export type PlatformEntityType =
  | "case"
  | "evidence"
  | "report"
  | "passport"
  | "workspace"
  | "backup";

export interface PlatformWorkspace {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformOperator {
  id: string;
  name: string;
  walletAddress: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformMembership {
  id: string;
  workspaceId: string;
  operatorId: string;
  role: "owner" | "admin" | "operator" | "viewer";
  createdAt: string;
}

export interface PlatformQueueItem {
  id: string;
  workspaceId: string;
  caseId: string;
  status: "pending" | "in_review" | "completed" | "blocked";
  priority: "low" | "normal" | "high";
  assignedOperatorId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublishedPassport {
  id: string;
  slug: string;
  workspaceId: string;
  party: string;
  role: TrustPassportRole;
  trustLevel: TrustPassportLevel;
  totalCases: number;
  verifiedCases: number;
  averageScore: number;
  totalReferencedValue: number;
  riskFlags: string[];
  caseIds: string[];
  publishedAt: string;
  updatedAt: string;
}

export interface PublicPassportView {
  slug: string;
  party: string;
  role: TrustPassportRole;
  trustLevel: TrustPassportLevel;
  totalCases: number;
  verifiedCases: number;
  averageScore: number;
  totalReferencedValue: number;
  riskFlags: string[];
  publishedAt: string;
  updatedAt: string;
}

export interface PlatformAuditEvent {
  id: string;
  type: PlatformAuditType;
  actorId: string;
  entityType: PlatformEntityType;
  entityId: string;
  detail: string;
  createdAt: string;
}

export interface PlatformStore {
  version: 1;
  workspaces: PlatformWorkspace[];
  operators: PlatformOperator[];
  memberships: PlatformMembership[];
  queue: PlatformQueueItem[];
  cases: CommerceCase[];
  publishedPassports: PublishedPassport[];
  auditEvents: PlatformAuditEvent[];
}

export interface PlatformSummary {
  workspaceCount: number;
  operatorCount: number;
  queueCount: number;
  caseCount: number;
  publishedPassportCount: number;
  auditEventCount: number;
}
