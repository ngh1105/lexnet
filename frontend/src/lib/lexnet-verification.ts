import type {
  CommerceCase,
  VerificationReport,
  VerificationVerdict,
} from "./lexnet-types";

export interface VerificationAdapter {
  source: "local" | "genlayer-contract";
  verify(commerceCase: CommerceCase): Promise<VerificationReport>;
}

export interface ContractVerificationAdapterOptions {
  contractAddress?: string;
}

export function buildLocalVerificationReport(
  commerceCase: CommerceCase,
  reviewedAt = new Date().toISOString()
): VerificationReport {
  const resourceTypes = new Set(
    commerceCase.evidence.map((item) => item.resourceType)
  );
  const riskFlags = buildRiskFlags(commerceCase, resourceTypes);
  const score = Math.max(
    0,
    Math.min(
      100,
      45 +
        Math.min(30, commerceCase.evidence.length * 12) +
        resourceTypes.size * 4 +
        Math.min(10, commerceCase.acceptanceCriteria.length * 2) -
        riskFlags.length * 12
    )
  );
  const verdict = getVerdict(score, commerceCase.evidence.length, riskFlags);
  const sellerShareBps = getSellerShareBps(verdict, score);

  return {
    verdict,
    score,
    summary: buildSummary(verdict, score, riskFlags),
    recommendation: buildRecommendation(verdict, sellerShareBps),
    sellerShareBps,
    reviewedAt,
    riskFlags,
    source: "local",
  };
}

export function createLocalVerificationAdapter(
  reviewedAt?: string
): VerificationAdapter {
  return {
    source: "local",
    async verify(commerceCase) {
      return buildLocalVerificationReport(commerceCase, reviewedAt);
    },
  };
}

export function createContractVerificationAdapter(
  options: ContractVerificationAdapterOptions
): VerificationAdapter {
  return {
    source: "genlayer-contract",
    async verify() {
      if (!options.contractAddress) {
        throw new Error("LexNetCommerceCore contract address is not configured");
      }

      throw new Error(
        "GenLayer contract verification requires a server-side call to verify_case(). Use the local adapter for browser-side verification and trigger on-chain verification through the contract write flow."
      );
    },
  };
}

function buildRiskFlags(
  commerceCase: CommerceCase,
  resourceTypes: Set<string>
): string[] {
  const flags: string[] = [];

  if (commerceCase.evidence.length === 0) {
    flags.push("No evidence submitted");
  }
  if (!resourceTypes.has("document") && !resourceTypes.has("repository")) {
    flags.push("No supporting document or repository evidence");
  }
  if (
    commerceCase.amountReference >= 5000 &&
    commerceCase.evidence.length < 3
  ) {
    flags.push("High value case has limited evidence");
  }

  return flags;
}

function getVerdict(
  score: number,
  evidenceCount: number,
  riskFlags: string[]
): VerificationVerdict {
  if (score >= 80 && riskFlags.length === 0) {
    return "APPROVE";
  }
  if (score >= 65 && evidenceCount > 0) {
    return "SPLIT_RECOMMENDED";
  }
  if (score >= 45) {
    return "REVISE";
  }
  return "REJECT";
}

function getSellerShareBps(verdict: VerificationVerdict, score: number): number {
  switch (verdict) {
    case "APPROVE":
      return 10000;
    case "SPLIT_RECOMMENDED":
      return Math.max(5000, Math.min(8500, score * 100));
    case "REVISE":
    case "REJECT":
      return 0;
  }
}

function buildSummary(
  verdict: VerificationVerdict,
  score: number,
  riskFlags: string[]
): string {
  if (riskFlags.length === 0) {
    return `Local AI verification scored this case ${score}/100 with no material risk flags.`;
  }

  return `Local AI verification scored this case ${score}/100 and found: ${riskFlags.join(
    "; "
  )}.`;
}

function buildRecommendation(
  verdict: VerificationVerdict,
  sellerShareBps: number
): string {
  switch (verdict) {
    case "APPROVE":
      return "Approve the case and mark the seller delivery as verified.";
    case "SPLIT_RECOMMENDED":
      return `Recommend a split outcome with ${Math.round(
        sellerShareBps / 100
      )}% credited to the seller until remaining gaps are resolved.`;
    case "REVISE":
      return "Request stronger evidence before settlement recommendation.";
    case "REJECT":
      return "Reject the delivery recommendation until the seller submits valid evidence.";
  }
}
