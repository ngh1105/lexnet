import { evaluateEvidenceUrlPolicy } from "./platform/evidence-policy";

import type {
  CaseTimelineItem,
  CommerceCase,
  CommerceCaseStats,
  CommandCenterMetrics,
  CreateCommerceCaseInput,
  CreateCommerceCaseOptions,
  EvidenceItem,
  EvidencePack,
  EvidenceQualitySummary,
  EvidenceResourceType,
  HighPriorityReview,
  PassportScoreBreakdown,
  TrustPassport,
  TrustPassportLevel,
  TrustPassportRole,
  VerificationReport,
  VerificationSummary,
  VerificationVerdict,
} from "./lexnet-types";

const MIN_AGREEMENT_TEXT_LENGTH = 40;
const MAX_EVIDENCE_URLS = 8;

const SETTLEMENT_READY_STATUSES = new Set([
  "VERIFIED",
  "REVISION_REQUESTED",
  "DISPUTED",
  "SETTLEMENT_RECOMMENDED",
]);

export function normalizeEvidenceUrls(urls: string[]): string[] {
  return evaluateEvidenceUrlPolicy(urls).acceptedUrls;
}

export function buildEvidencePack(urls: string[]): EvidencePack {
  const normalizedUrls = normalizeEvidenceUrls(urls).slice(0, MAX_EVIDENCE_URLS);
  const items = normalizedUrls.map((url) => ({
    url,
    resourceType: inferEvidenceResourceType(url),
    checksum: buildChecksum(url),
  }));

  return {
    caseChecksum: buildChecksum(items.map((item) => item.checksum).join("|")),
    items,
  };
}

export function createCommerceCase(
  input: CreateCommerceCaseInput,
  options: CreateCommerceCaseOptions = {}
): CommerceCase {
  const createdAt = options.createdAt ?? new Date().toISOString();
  const title = input.title.trim();
  const buyer = input.buyer.trim();
  const seller = input.seller.trim();
  const agreementText = input.agreementText.trim();
  const acceptanceCriteria = input.acceptanceCriteria
    .map((criterion) => criterion.trim())
    .filter(Boolean);
  if (agreementText.length < MIN_AGREEMENT_TEXT_LENGTH) {
    throw new Error("agreementText must be at least 40 characters");
  }
  if (!Number.isFinite(input.amountReference) || input.amountReference <= 0) {
    throw new Error("amountReference must be greater than zero");
  }

  const amountReference = Math.round(input.amountReference);

  if (amountReference <= 0) {
    throw new Error("amountReference must be greater than zero");
  }

  return {
    id:
      options.id ??
      `lx-case-${buildChecksum(
        [title, buyer, seller, agreementText, createdAt].join("|")
      ).slice(3, 11)}`,
    title,
    buyer,
    seller,
    agreementText,
    acceptanceCriteria,
    amountReference,
    status: "ACTIVE",
    evidence: [],
    verificationReport: null,
    createdAt,
  };
}

export function appendEvidenceToCase(
  commerceCase: CommerceCase,
  urls: string[]
): CommerceCase {
  const incomingPack = buildEvidencePack(urls);
  const existingByUrl = new Map(
    commerceCase.evidence.map((item) => [item.url, item])
  );

  for (const item of incomingPack.items) {
    existingByUrl.set(item.url, item);
  }

  const evidence = Array.from(existingByUrl.values());

  return {
    ...commerceCase,
    evidence,
    status:
      evidence.length > 0 && commerceCase.status === "ACTIVE"
        ? "EVIDENCE_SUBMITTED"
        : commerceCase.status,
  };
}

export function applyVerificationReport(
  commerceCase: CommerceCase,
  report: VerificationReport
): CommerceCase {
  return {
    ...commerceCase,
    status: getStatusForVerdict(report.verdict),
    verificationReport: report,
  };
}

export function buildCommerceCaseStats(
  cases: CommerceCase[]
): CommerceCaseStats {
  return {
    totalCases: cases.length,
    activeCases: cases.filter((commerceCase) => !SETTLEMENT_READY_STATUSES.has(commerceCase.status)).length,
    settlementReady: cases.filter((commerceCase) => SETTLEMENT_READY_STATUSES.has(commerceCase.status)).length,
    totalReferencedValue: cases.reduce(
      (sum, commerceCase) => sum + commerceCase.amountReference,
      0
    ),
  };
}

export function buildVerificationSummary(
  commerceCase: CommerceCase
): VerificationSummary {
  const report = commerceCase.verificationReport;
  if (!report) {
    return {
      label: "Not Reviewed",
      scoreLabel: "Pending",
      sellerShareLabel: "No settlement",
      nextAction: getNextAction(commerceCase),
    };
  }

  return {
    label: getVerdictLabel(report.verdict),
    scoreLabel: `${report.score}/100`,
    sellerShareLabel: `${Math.round(report.sellerShareBps / 100)}% seller share`,
    nextAction: getNextAction(commerceCase),
  };
}

export function buildTrustPassports(cases: CommerceCase[]): TrustPassport[] {
  const byPartyAndRole = new Map<string, CommerceCase[]>();

  for (const commerceCase of cases) {
    addPassportCase(byPartyAndRole, "buyer", commerceCase.buyer, commerceCase);
    addPassportCase(byPartyAndRole, "seller", commerceCase.seller, commerceCase);
  }

  return Array.from(byPartyAndRole.entries())
    .map(([key, partyCases]) => {
      const [role, party] = key.split(":", 2) as [TrustPassportRole, string];
      const scoredCases = partyCases.filter(
        (commerceCase) => commerceCase.verificationReport
      );
      const scoreTotal = scoredCases.reduce(
        (sum, commerceCase) => sum + (commerceCase.verificationReport?.score ?? 0),
        0
      );
      const averageScore =
        scoredCases.length > 0 ? Math.round(scoreTotal / scoredCases.length) : 0;
      const riskFlags = Array.from(
        new Set(
          scoredCases.flatMap(
            (commerceCase) => commerceCase.verificationReport?.riskFlags ?? []
          )
        )
      );

      return {
        party,
        role,
        totalCases: partyCases.length,
        verifiedCases: scoredCases.filter(
          (commerceCase) => commerceCase.verificationReport?.verdict === "APPROVE"
        ).length,
        averageScore,
        totalReferencedValue: partyCases.reduce(
          (sum, commerceCase) => sum + commerceCase.amountReference,
          0
        ),
        trustLevel: getTrustPassportLevel(averageScore, riskFlags),
        riskFlags,
        lastActivityAt: partyCases
          .map((commerceCase) => commerceCase.verificationReport?.reviewedAt ?? commerceCase.createdAt)
          .sort()
          .at(-1) ?? "",
      };
    })
    .sort((left, right) => {
      if (right.averageScore !== left.averageScore) {
        return right.averageScore - left.averageScore;
      }
      return right.totalReferencedValue - left.totalReferencedValue;
    });
}

export function buildCommandCenterMetrics(cases: CommerceCase[]): CommandCenterMetrics {
  const passports = buildTrustPassports(cases);

  return {
    protectedValue: cases.reduce((sum, commerceCase) => sum + commerceCase.amountReference, 0),
    aiReviewedCases: cases.filter((commerceCase) => commerceCase.verificationReport).length,
    settlementReadyCases: cases.filter((commerceCase) => SETTLEMENT_READY_STATUSES.has(commerceCase.status)).length,
    passportsIssued: passports.length,
    evidenceItems: cases.reduce((sum, commerceCase) => sum + commerceCase.evidence.length, 0),
  };
}

export function buildHighPriorityReviews(cases: CommerceCase[]): HighPriorityReview[] {
  return [...cases]
    .sort((left, right) => getPriorityScore(right) - getPriorityScore(left))
    .slice(0, 4)
    .map((commerceCase) => {
      const summary = buildVerificationSummary(commerceCase);

      return {
        caseId: commerceCase.id,
        title: commerceCase.title,
        status: commerceCase.status,
        amountReference: commerceCase.amountReference,
        evidenceCount: commerceCase.evidence.length,
        scoreLabel: summary.scoreLabel,
        nextAction: summary.nextAction,
        priorityReason: getPriorityReason(commerceCase),
      };
    });
}

export function buildCaseTimeline(commerceCase: CommerceCase): CaseTimelineItem[] {
  const hasEvidence = commerceCase.evidence.length > 0;
  const hasReport = Boolean(commerceCase.verificationReport);
  const isSettlementReady = SETTLEMENT_READY_STATUSES.has(commerceCase.status);

  return [
    {
      label: "Case opened",
      detail: commerceCase.createdAt.slice(0, 10),
      status: "complete",
    },
    {
      label: "Evidence submitted",
      detail: hasEvidence ? `${commerceCase.evidence.length} evidence item(s)` : "Waiting for seller evidence",
      status: hasEvidence ? "complete" : "active",
    },
    {
      label: "AI verification",
      detail: hasReport ? `${commerceCase.verificationReport?.score}/100 confidence score` : "Run local verification or GenLayer preview",
      status: hasReport ? "complete" : hasEvidence ? "active" : "blocked",
    },
    {
      label: "Settlement decision",
      detail: isSettlementReady ? getNextAction(commerceCase) : "Not ready for settlement",
      status: isSettlementReady ? "active" : "blocked",
    },
    {
      label: "Trust passport update",
      detail: hasReport ? "Included in buyer and seller trust history" : "Pending verified report",
      status: hasReport ? "complete" : "blocked",
    },
  ];
}

export function buildEvidenceQualitySummary(commerceCase: CommerceCase): EvidenceQualitySummary {
  const repositoryItems = commerceCase.evidence.filter((item) => item.resourceType === "repository").length;
  const documentItems = commerceCase.evidence.filter((item) => item.resourceType === "document").length;
  const webItems = commerceCase.evidence.filter((item) => item.resourceType === "web").length;
  const totalItems = commerceCase.evidence.length;

  return {
    totalItems,
    repositoryItems,
    documentItems,
    webItems,
    qualityLabel: getEvidenceQualityLabel(totalItems, repositoryItems, documentItems),
  };
}

export function buildPassportScoreBreakdown(passport: TrustPassport): PassportScoreBreakdown {
  const verificationRate = passport.totalCases > 0 ? Math.round((passport.verifiedCases / passport.totalCases) * 100) : 0;
  const scoreStrength = passport.averageScore;
  const valueWeight = Math.min(Math.round(passport.totalReferencedValue / 1000), 100);
  const riskPenalty = Math.min(passport.riskFlags.length * 20, 100);

  return {
    verificationRate,
    scoreStrength,
    valueWeight,
    riskPenalty,
  };
}

export function inferEvidenceResourceType(url: string): EvidenceResourceType {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes("github.com") || lowerUrl.includes("gitlab.com")) {
    return "repository";
  }
  if (
    lowerUrl.endsWith(".pdf") ||
    lowerUrl.includes("docs.google.com") ||
    lowerUrl.includes("notion.site")
  ) {
    return "document";
  }
  return "web";
}

export function getVerdictLabel(verdict: VerificationVerdict): string {
  switch (verdict) {
    case "APPROVE":
      return "Approved";
    case "REVISE":
      return "Revision Requested";
    case "REJECT":
      return "Rejected";
    case "SPLIT_RECOMMENDED":
      return "Split Recommended";
  }
}

export function getNextAction(commerceCase: CommerceCase): string {
  switch (commerceCase.status) {
    case "DRAFT":
      return "Activate agreement";
    case "ACTIVE":
      return "Submit delivery evidence";
    case "EVIDENCE_SUBMITTED":
      return "Run AI verification";
    case "UNDER_AI_REVIEW":
      return "Wait for consensus";
    case "VERIFIED":
    case "REVISION_REQUESTED":
    case "DISPUTED":
    case "SETTLEMENT_RECOMMENDED":
      return "Review settlement recommendation";
  }
}

function getPriorityScore(commerceCase: CommerceCase): number {
  const report = commerceCase.verificationReport;
  const riskWeight = report?.riskFlags?.length ? 100 : 0;
  const settlementWeight = SETTLEMENT_READY_STATUSES.has(commerceCase.status) ? 80 : 0;
  const valueWeight = Math.min(Math.round(commerceCase.amountReference / 100), 60);
  const evidenceWeight = commerceCase.evidence.length > 0 ? 25 : 0;

  return riskWeight + settlementWeight + valueWeight + evidenceWeight;
}

function getPriorityReason(commerceCase: CommerceCase): string {
  if (commerceCase.verificationReport?.riskFlags?.length) {
    return "Risk flags need operator review";
  }
  if (commerceCase.status === "SETTLEMENT_RECOMMENDED") {
    return "Settlement recommendation is ready";
  }
  if (commerceCase.evidence.length === 0) {
    return "Evidence has not been submitted";
  }
  return "High-value case ready for review";
}

function getEvidenceQualityLabel(totalItems: number, repositoryItems: number, documentItems: number): string {
  if (totalItems === 0) {
    return "No evidence submitted";
  }
  if (repositoryItems > 0 && documentItems > 0) {
    return "Strong provenance mix";
  }
  if (totalItems >= 2) {
    return "Reviewable evidence set";
  }
  return "Thin evidence set";
}

function addPassportCase(
  passports: Map<string, CommerceCase[]>,
  role: TrustPassportRole,
  party: string,
  commerceCase: CommerceCase
) {
  const key = `${role}:${party}`;
  const existingCases = passports.get(key) ?? [];
  existingCases.push(commerceCase);
  passports.set(key, existingCases);
}

function getStatusForVerdict(verdict: VerificationVerdict): CommerceCase["status"] {
  switch (verdict) {
    case "APPROVE":
      return "VERIFIED";
    case "REVISE":
      return "REVISION_REQUESTED";
    case "REJECT":
      return "DISPUTED";
    case "SPLIT_RECOMMENDED":
      return "SETTLEMENT_RECOMMENDED";
  }
}

function getTrustPassportLevel(
  averageScore: number,
  riskFlags: string[]
): TrustPassportLevel {
  if (averageScore >= 85 && riskFlags.length === 0) {
    return "Established";
  }
  if (averageScore >= 75) {
    return "Reliable";
  }
  if (averageScore >= 60) {
    return "Developing";
  }
  return "At Risk";
}

function buildChecksum(value: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * prime);
  }

  return `lx_${hash.toString(16).padStart(16, "0")}`;
}
