export type CommerceCaseStatus =
  | "DRAFT"
  | "ACTIVE"
  | "EVIDENCE_SUBMITTED"
  | "UNDER_AI_REVIEW"
  | "VERIFIED"
  | "REVISION_REQUESTED"
  | "DISPUTED"
  | "SETTLEMENT_RECOMMENDED";

export type VerificationVerdict =
  | "APPROVE"
  | "REVISE"
  | "REJECT"
  | "SPLIT_RECOMMENDED";

export type EvidenceResourceType = "web" | "repository" | "document";

export interface EvidenceItem {
  url: string;
  resourceType: EvidenceResourceType;
  checksum: string;
}

export interface EvidencePack {
  caseChecksum: string;
  items: EvidenceItem[];
}

export interface VerificationReport {
  verdict: VerificationVerdict;
  score: number;
  summary: string;
  recommendation: string;
  sellerShareBps: number;
  reviewedAt: string;
  riskFlags?: string[];
  source?: "local" | "genlayer-contract";
}

export interface CommerceCase {
  id: string;
  title: string;
  buyer: string;
  seller: string;
  agreementText: string;
  acceptanceCriteria: string[];
  amountReference: number;
  status: CommerceCaseStatus;
  evidence: EvidenceItem[];
  verificationReport: VerificationReport | null;
  createdAt: string;
}

export interface CommerceCaseStats {
  totalCases: number;
  activeCases: number;
  settlementReady: number;
  totalReferencedValue: number;
}

export interface VerificationSummary {
  label: string;
  scoreLabel: string;
  sellerShareLabel: string;
  nextAction: string;
}

export interface CreateCommerceCaseInput {
  title: string;
  buyer: string;
  seller: string;
  agreementText: string;
  acceptanceCriteria: string[];
  amountReference: number;
}

export interface CreateCommerceCaseOptions {
  id?: string;
  createdAt?: string;
}

export type TrustPassportRole = "buyer" | "seller";

export type TrustPassportLevel =
  | "Established"
  | "Reliable"
  | "Developing"
  | "At Risk";

export interface TrustPassport {
  party: string;
  role: TrustPassportRole;
  totalCases: number;
  verifiedCases: number;
  averageScore: number;
  totalReferencedValue: number;
  trustLevel: TrustPassportLevel;
  riskFlags: string[];
  lastActivityAt: string;
}

export interface CommandCenterMetrics {
  protectedValue: number;
  aiReviewedCases: number;
  settlementReadyCases: number;
  passportsIssued: number;
  evidenceItems: number;
}

export interface CommandCenterSignals {
  activeCases: number;
  evidenceItems: number;
  reviewedCases: number;
  queueCount: number;
  blockedQueueItems: number;
  publishedPassportCount: number;
  auditEventCount: number;
  readinessPercent: number;
}

export interface HighPriorityReview {
  caseId: string;
  title: string;
  status: CommerceCaseStatus;
  amountReference: number;
  evidenceCount: number;
  scoreLabel: string;
  nextAction: string;
  priorityReason: string;
}

export interface CaseTimelineItem {
  label: string;
  detail: string;
  status: "complete" | "active" | "blocked";
}

export interface EvidenceQualitySummary {
  totalItems: number;
  repositoryItems: number;
  documentItems: number;
  webItems: number;
  qualityLabel: string;
}

export interface PassportScoreBreakdown {
  verificationRate: number;
  scoreStrength: number;
  valueWeight: number;
  riskPenalty: number;
}
