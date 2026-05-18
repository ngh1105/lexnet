import test from "node:test";
import assert from "node:assert/strict";

import {
  appendEvidenceToCase,
  applyVerificationReport,
  buildCaseTimeline,
  buildCommandCenterMetrics,
  buildCommandCenterSignals,
  buildCommerceCaseStats,
  buildEvidencePack,
  buildEvidenceQualitySummary,
  buildHighPriorityReviews,
  buildPassportScoreBreakdown,
  buildTrustPassports,
  buildVerificationSummary,
  createCommerceCase,
  getNextAction,
  getVerdictLabel,
  inferEvidenceResourceType,
  normalizeEvidenceUrls,
} from "../src/lib/lexnet-domain";
import {
  buildCreateCaseCallPreview,
  buildSubmitEvidenceCallPreview,
  buildVerifyCaseCallPreview,
  getLexNetContractReadiness,
} from "../src/lib/lexnet-contract";
import type { CommerceCase, VerificationReport } from "../src/lib/lexnet-types";
import type { DashboardQueueItem, PlatformSummary } from "../src/lib/platform/types";

const reviewedReport: VerificationReport = {
  verdict: "APPROVE",
  score: 88,
  summary: "Delivery satisfies acceptance criteria.",
  recommendation: "Release the settlement to the seller.",
  sellerShareBps: 10000,
  reviewedAt: "2026-05-12T09:00:00.000Z",
  riskFlags: [],
  source: "local",
};

const seedCases: CommerceCase[] = [
  {
    ...createCommerceCase(
      {
        title: "Reviewed delivery",
        buyer: "buyerA",
        seller: "sellerA",
        agreementText: "Agreement text long enough for this reviewed command center case",
        acceptanceCriteria: ["done"],
        amountReference: 2500,
      },
      { id: "case-reviewed", createdAt: "2026-05-11T08:00:00.000Z" },
    ),
    status: "VERIFIED",
    evidence: buildEvidencePack([
      "https://github.com/acme/repo",
      "https://docs.google.com/document/d/abc",
    ]).items,
    verificationReport: reviewedReport,
  },
  {
    ...createCommerceCase(
      {
        title: "Pending evidence review",
        buyer: "buyerB",
        seller: "sellerB",
        agreementText: "Agreement text long enough for this pending command center case",
        acceptanceCriteria: ["done"],
        amountReference: 4200,
      },
      { id: "case-pending", createdAt: "2026-05-12T08:00:00.000Z" },
    ),
    status: "EVIDENCE_SUBMITTED",
    evidence: buildEvidencePack(["https://example.com/evidence"]).items,
  },
];

test("normalizeEvidenceUrls trims, filters protocol, and deduplicates", () => {
  const result = normalizeEvidenceUrls([
    "  https://example.com/a  ",
    "http://example.com/b",
    "ftp://example.com/c",
    "https://example.com/a",
    "not-a-url",
  ]);

  assert.deepEqual(result, ["https://example.com/a", "http://example.com/b"]);
});

test("buildEvidencePack includes only public evidence URLs", () => {
  const pack = buildEvidencePack([
    "https://example.com/public-proof",
    "https://localhost/private-proof",
    "https://192.168.1.10/private-proof",
  ]);

  assert.deepEqual(pack.items.map((item) => item.url), ["https://example.com/public-proof"]);
});

test("buildEvidencePack requires HTTPS evidence in production", () => {
  const pack = buildEvidencePack([
    "http://example.com/plain-proof",
    "https://example.com/secure-proof",
  ], {
    LEXNET_RUNTIME_MODE: "production",
    LEXNET_EVIDENCE_RETENTION_POLICY: "metadata-365d",
  });

  assert.deepEqual(pack.items.map((item) => item.url), ["https://example.com/secure-proof"]);
});

test("buildEvidencePack returns deterministic checksums and inferred resource types", () => {
  const pack = buildEvidencePack([
    "https://github.com/org/repo",
    "https://docs.google.com/document/d/abc",
    "https://example.com/page",
  ]);

  assert.equal(pack.items.length, 3);
  assert.equal(pack.items[0]?.resourceType, "repository");
  assert.equal(pack.items[1]?.resourceType, "document");
  assert.equal(pack.items[2]?.resourceType, "web");
  assert.match(pack.caseChecksum, /^lx_[a-f0-9]{16}$/);
  for (const item of pack.items) {
    assert.match(item.checksum, /^lx_[a-f0-9]{16}$/);
  }
});

test("buildEvidencePack caps evidence URLs to eight", () => {
  const urls = Array.from({ length: 9 }, (_, index) => `https://example.com/${index + 1}`);

  const pack = buildEvidencePack(urls);

  assert.equal(pack.items.length, 8);
  assert.equal(pack.items.at(-1)?.url, "https://example.com/8");
});

test("createCommerceCase normalizes fields and creates ACTIVE case", () => {
  const createdAt = "2026-05-12T12:00:00.000Z";
  const result = createCommerceCase(
    {
      title: "  Delivery check  ",
      buyer: "  0xbuyer  ",
      seller: "  0xseller  ",
      agreementText: "  Deliver files and summary report with full acceptance detail  ",
      acceptanceCriteria: ["  one  ", "", " two "],
      amountReference: 42.8,
    },
    { createdAt },
  );

  assert.equal(result.title, "Delivery check");
  assert.equal(result.buyer, "0xbuyer");
  assert.equal(result.seller, "0xseller");
  assert.equal(result.agreementText, "Deliver files and summary report with full acceptance detail");
  assert.deepEqual(result.acceptanceCriteria, ["one", "two"]);
  assert.equal(result.amountReference, 43);
  assert.equal(result.status, "ACTIVE");
  assert.equal(result.verificationReport, null);
  assert.equal(result.createdAt, createdAt);
  assert.match(result.id, /^lx-case-[a-f0-9]{8}$/);
});

test("createCommerceCase rejects short agreement text", () => {
  assert.throws(
    () =>
      createCommerceCase({
        title: "Case",
        buyer: "0xb",
        seller: "0xs",
        agreementText: "Too short",
        acceptanceCriteria: ["done"],
        amountReference: 100,
      }),
    /agreementText must be at least 40 characters/,
  );
});

test("createCommerceCase rejects zero amount reference", () => {
  assert.throws(
    () =>
      createCommerceCase({
        title: "Case",
        buyer: "0xb",
        seller: "0xs",
        agreementText: "Agreement text long enough for this domain test",
        acceptanceCriteria: ["done"],
        amountReference: 0,
      }),
    /amountReference must be greater than zero/,
  );
});

test("getLexNetContractReadiness reports local fallback when contract address is missing", () => {
  const readiness = getLexNetContractReadiness({
    env: {
      NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS: "",
      NEXT_PUBLIC_GENLAYER_RPC_URL: "https://studio.genlayer.com/api",
      NEXT_PUBLIC_GENLAYER_NETWORK_LABEL: "Studionet",
    },
    walletConnected: true,
  });

  assert.equal(readiness.isReady, false);
  assert.equal(readiness.modeLabel, "StudioNet Workspace Verification");
  assert.deepEqual(readiness.blockingReasons, ["Contract address is not configured."]);
});

test("getLexNetContractReadiness blocks contract execution without wallet", () => {
  const readiness = getLexNetContractReadiness({
    env: {
      NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS: "0xabc",
      NEXT_PUBLIC_GENLAYER_RPC_URL: "https://studio.genlayer.com/api",
      NEXT_PUBLIC_GENLAYER_NETWORK_LABEL: "Studionet",
    },
    walletConnected: false,
  });

  assert.equal(readiness.isReady, false);
  assert.equal(readiness.modeLabel, "StudioNet Contract Ready / Workspace Verification");
  assert.deepEqual(readiness.blockingReasons, ["Wallet is not connected."]);
});

test("getLexNetContractReadiness blocks non-owner wallets", () => {
  const readiness = getLexNetContractReadiness({
    env: {
      NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS: "0xabc",
      NEXT_PUBLIC_GENLAYER_RPC_URL: "https://studio.genlayer.com/api",
      NEXT_PUBLIC_GENLAYER_NETWORK_LABEL: "Studionet",
      NEXT_PUBLIC_LEXNET_OWNER_WALLET_ADDRESS: "0x1111111111111111111111111111111111111111",
    },
    walletConnected: true,
    connectedWalletAddress: "0x2222222222222222222222222222222222222222",
  });

  assert.equal(readiness.isReady, false);
  assert.deepEqual(readiness.blockingReasons, [
    "Connect the owner wallet before adding a watched contract.",
  ]);
});

test("getLexNetContractReadiness is ready when contract and wallet are available", () => {
  const readiness = getLexNetContractReadiness({
    env: {
      NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS: "0xabc",
      NEXT_PUBLIC_GENLAYER_RPC_URL: "https://studio.genlayer.com/api",
      NEXT_PUBLIC_GENLAYER_NETWORK_LABEL: "Studionet",
    },
    walletConnected: true,
  });

  assert.equal(readiness.isReady, true);
  assert.deepEqual(readiness.blockingReasons, []);
  assert.equal(readiness.contractAddress, "0xabc");
});

test("contract call previews expose guarded GenLayer payloads", () => {
  const readiness = getLexNetContractReadiness({
    env: {
      NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS: "0xabc",
      NEXT_PUBLIC_GENLAYER_RPC_URL: "https://studio.genlayer.com/api",
      NEXT_PUBLIC_GENLAYER_NETWORK_LABEL: "Studionet",
    },
    walletConnected: true,
  });
  const input = {
    title: "Case",
    buyer: "0xb",
    seller: "0xs",
    agreementText: "Agreement text long enough for this contract preview test",
    acceptanceCriteria: ["done"],
    amountReference: 100,
  };
  const commerceCase = createCommerceCase(input, { id: "lx-case-preview" });

  const createPreview = buildCreateCaseCallPreview(input, readiness);
  const evidencePreview = buildSubmitEvidenceCallPreview(
    commerceCase,
    ["https://example.com/evidence"],
    readiness,
  );
  const verifyPreview = buildVerifyCaseCallPreview(commerceCase, readiness);

  assert.equal(createPreview.enabled, true);
  assert.equal(createPreview.method, "create_case");
  assert.equal(createPreview.payload.seller, "0xs");
  assert.equal(evidencePreview.method, "submit_evidence");
  assert.equal(evidencePreview.payload.case_id, "lx-case-preview");
  assert.equal(verifyPreview.method, "verify_case");
});

test("appendEvidenceToCase adds evidence and updates ACTIVE to EVIDENCE_SUBMITTED", () => {
  const base = createCommerceCase({
    title: "Case",
    buyer: "0xb",
    seller: "0xs",
    agreementText: "Agreement text long enough for this domain test",
    acceptanceCriteria: ["done"],
    amountReference: 100,
  });

  const updated = appendEvidenceToCase(base, ["https://example.com/e1"]);

  assert.equal(updated.status, "EVIDENCE_SUBMITTED");
  assert.equal(updated.evidence.length, 1);
  assert.equal(updated.evidence[0]?.url, "https://example.com/e1");
});

test("appendEvidenceToCase deduplicates by URL and preserves non-ACTIVE status", () => {
  const base = createCommerceCase(
    {
      title: "Case",
      buyer: "0xb",
      seller: "0xs",
      agreementText: "Agreement text long enough for this domain test",
      acceptanceCriteria: ["done"],
      amountReference: 100,
    },
    { id: "case-1" },
  );
  const withEvidence = appendEvidenceToCase(base, [
    "https://example.com/e1",
    "https://example.com/e2",
  ]);

  const reviewedCase: CommerceCase = {
    ...withEvidence,
    status: "SETTLEMENT_RECOMMENDED",
  };

  const result = appendEvidenceToCase(reviewedCase, [
    "https://example.com/e2",
    "https://example.com/e3",
  ]);

  assert.equal(result.status, "SETTLEMENT_RECOMMENDED");
  assert.equal(result.evidence.length, 3);
  assert.deepEqual(
    result.evidence.map((item) => item.url).sort(),
    ["https://example.com/e1", "https://example.com/e2", "https://example.com/e3"],
  );
});

test("applyVerificationReport maps verdict to status and stores report", () => {
  const base = createCommerceCase({
    title: "Case",
    buyer: "0xb",
    seller: "0xs",
    agreementText: "Agreement text long enough for this domain test",
    acceptanceCriteria: ["done"],
    amountReference: 100,
  });

  const report: VerificationReport = {
    verdict: "REJECT",
    score: 20,
    summary: "insufficient",
    recommendation: "resubmit",
    sellerShareBps: 0,
    reviewedAt: "2026-05-12T12:30:00.000Z",
    riskFlags: ["No evidence submitted"],
    source: "local",
  };

  const updated = applyVerificationReport(base, report);

  assert.equal(updated.status, "DISPUTED");
  assert.deepEqual(updated.verificationReport, report);
});

test("buildCommerceCaseStats computes totals and status buckets", () => {
  const cases: CommerceCase[] = [
    {
      ...createCommerceCase({
        title: "A",
        buyer: "0xb1",
        seller: "0xs1",
        agreementText: "Agreement text long enough for this domain test",
        acceptanceCriteria: ["done"],
        amountReference: 100,
      }),
      status: "ACTIVE",
    },
    {
      ...createCommerceCase({
        title: "B",
        buyer: "0xb2",
        seller: "0xs2",
        agreementText: "Agreement text long enough for this domain test",
        acceptanceCriteria: ["done"],
        amountReference: 200,
      }),
      status: "VERIFIED",
    },
    {
      ...createCommerceCase({
        title: "C",
        buyer: "0xb3",
        seller: "0xs3",
        agreementText: "Agreement text long enough for this domain test",
        acceptanceCriteria: ["done"],
        amountReference: 300,
      }),
      status: "SETTLEMENT_RECOMMENDED",
    },
  ];

  const stats = buildCommerceCaseStats(cases);

  assert.deepEqual(stats, {
    totalCases: 3,
    activeCases: 1,
    settlementReady: 2,
    totalReferencedValue: 600,
  });
});

test("buildVerificationSummary shows pending when report is missing", () => {
  const commerceCase = createCommerceCase({
    title: "Case",
    buyer: "0xb",
    seller: "0xs",
    agreementText: "Agreement text long enough for this domain test",
    acceptanceCriteria: ["done"],
    amountReference: 100,
  });

  const summary = buildVerificationSummary(commerceCase);

  assert.deepEqual(summary, {
    label: "Not Reviewed",
    scoreLabel: "Pending",
    sellerShareLabel: "No settlement",
    nextAction: "Submit delivery evidence",
  });
});

test("buildVerificationSummary formats reviewed report fields", () => {
  const commerceCase = createCommerceCase({
    title: "Case",
    buyer: "0xb",
    seller: "0xs",
    agreementText: "Agreement text long enough for this domain test",
    acceptanceCriteria: ["done"],
    amountReference: 100,
  });

  const reviewed: CommerceCase = {
    ...commerceCase,
    status: "SETTLEMENT_RECOMMENDED",
    verificationReport: {
      verdict: "SPLIT_RECOMMENDED",
      score: 74,
      summary: "ok",
      recommendation: "split",
      sellerShareBps: 7500,
      reviewedAt: "2026-05-12T12:00:00.000Z",
      riskFlags: [],
      source: "local",
    },
  };

  const summary = buildVerificationSummary(reviewed);

  assert.deepEqual(summary, {
    label: "Split Recommended",
    scoreLabel: "74/100",
    sellerShareLabel: "75% seller share",
    nextAction: "Review settlement recommendation",
  });
});

test("buildTrustPassports aggregates by buyer and seller with trust levels", () => {
  const approvedReport: VerificationReport = {
    verdict: "APPROVE",
    score: 92,
    summary: "great",
    recommendation: "approve",
    sellerShareBps: 10000,
    reviewedAt: "2026-05-11T09:00:00.000Z",
    riskFlags: [],
    source: "local",
  };
  const splitReport: VerificationReport = {
    verdict: "SPLIT_RECOMMENDED",
    score: 72,
    summary: "partial",
    recommendation: "split",
    sellerShareBps: 7000,
    reviewedAt: "2026-05-12T10:00:00.000Z",
    riskFlags: ["High value case has limited evidence"],
    source: "local",
  };

  const cases: CommerceCase[] = [
    {
      ...createCommerceCase(
        {
          title: "Case 1",
          buyer: "buyerA",
          seller: "sellerA",
          agreementText: "Agreement text long enough for this domain test",
          acceptanceCriteria: ["done"],
          amountReference: 1500,
        },
        { id: "c1", createdAt: "2026-05-10T10:00:00.000Z" },
      ),
      status: "VERIFIED",
      verificationReport: approvedReport,
    },
    {
      ...createCommerceCase(
        {
          title: "Case 2",
          buyer: "buyerA",
          seller: "sellerB",
          agreementText: "Agreement text long enough for this domain test",
          acceptanceCriteria: ["done"],
          amountReference: 4200,
        },
        { id: "c2", createdAt: "2026-05-12T08:00:00.000Z" },
      ),
      status: "SETTLEMENT_RECOMMENDED",
      verificationReport: splitReport,
    },
  ];

  const passports = buildTrustPassports(cases);

  const buyerA = passports.find((item) => item.role === "buyer" && item.party === "buyerA");
  assert.ok(buyerA);
  assert.equal(buyerA.totalCases, 2);
  assert.equal(buyerA.verifiedCases, 1);
  assert.equal(buyerA.averageScore, 82);
  assert.equal(buyerA.totalReferencedValue, 5700);
  assert.equal(buyerA.trustLevel, "Reliable");
  assert.deepEqual(buyerA.riskFlags, ["High value case has limited evidence"]);
  assert.equal(buyerA.lastActivityAt, "2026-05-12T10:00:00.000Z");

  assert.equal(passports.length, 3);
});

test("buildCommandCenterMetrics summarizes demo operating metrics", () => {
  const metrics = buildCommandCenterMetrics(seedCases);

  assert.equal(metrics.protectedValue, 6700);
  assert.equal(metrics.aiReviewedCases, 1);
  assert.equal(metrics.passportsIssued, 4);
  assert.equal(metrics.evidenceItems, 3);
});

test("buildCommandCenterSignals combines real case, queue, and platform counts", () => {
  const platformSummary: PlatformSummary = {
    workspaceCount: 1,
    operatorCount: 2,
    queueCount: 4,
    caseCount: seedCases.length,
    publishedPassportCount: 6,
    auditEventCount: 19,
  };
  const queueItems: DashboardQueueItem[] = [
    {
      id: "q1",
      caseId: "case-reviewed",
      status: "completed",
      priority: "normal",
      createdAt: "2026-05-12T08:00:00.000Z",
      updatedAt: "2026-05-12T09:00:00.000Z",
    },
    {
      id: "q2",
      caseId: "case-active",
      status: "blocked",
      priority: "high",
      createdAt: "2026-05-12T10:00:00.000Z",
      updatedAt: "2026-05-12T11:00:00.000Z",
    },
  ];

  const signals = buildCommandCenterSignals(seedCases, {
    platformSummary,
    queueItems,
  });

  assert.equal(signals.activeCases, 1);
  assert.equal(signals.evidenceItems, 3);
  assert.equal(signals.reviewedCases, 1);
  assert.equal(signals.queueCount, 4);
  assert.equal(signals.blockedQueueItems, 1);
  assert.equal(signals.publishedPassportCount, 6);
  assert.equal(signals.auditEventCount, 19);
  assert.equal(signals.readinessPercent, 83);
});

test("buildHighPriorityReviews returns review cards with reasons", () => {
  const reviews = buildHighPriorityReviews(seedCases);

  assert.equal(reviews.length, 2);
  assert.equal(Boolean(reviews[0]?.caseId), true);
  assert.equal(Boolean(reviews[0]?.priorityReason), true);
});

test("buildCaseTimeline tracks evidence, verification, settlement, and passport steps", () => {
  const timeline = buildCaseTimeline(seedCases[0]);

  assert.deepEqual(
    timeline.map((item) => item.label),
    [
      "Case opened",
      "Evidence submitted",
      "AI verification",
      "Settlement decision",
      "Trust passport update",
    ],
  );
});

test("buildEvidenceQualitySummary labels evidence mix", () => {
  const summary = buildEvidenceQualitySummary(seedCases[0]);

  assert.equal(summary.totalItems, seedCases[0]?.evidence.length);
  assert.equal(summary.qualityLabel, "Strong provenance mix");
});

test("buildPassportScoreBreakdown derives bounded score parts", () => {
  const passport = buildTrustPassports(seedCases)[0];
  assert.ok(passport);

  const breakdown = buildPassportScoreBreakdown(passport);

  assert.equal(breakdown.verificationRate >= 0 && breakdown.verificationRate <= 100, true);
  assert.equal(breakdown.scoreStrength >= 0 && breakdown.scoreStrength <= 100, true);
  assert.equal(breakdown.valueWeight >= 0 && breakdown.valueWeight <= 100, true);
  assert.equal(breakdown.riskPenalty >= 0 && breakdown.riskPenalty <= 100, true);
});

test("inferEvidenceResourceType classifies repository and document URLs", () => {
  assert.equal(inferEvidenceResourceType("https://github.com/org/repo"), "repository");
  assert.equal(inferEvidenceResourceType("https://docs.google.com/document/d/abc"), "document");
  assert.equal(inferEvidenceResourceType("https://example.com/page"), "web");
});

test("getVerdictLabel and getNextAction return expected labels", () => {
  assert.equal(getVerdictLabel("APPROVE"), "Approved");
  assert.equal(getVerdictLabel("REVISE"), "Revision Requested");
  assert.equal(getVerdictLabel("REJECT"), "Rejected");
  assert.equal(getVerdictLabel("SPLIT_RECOMMENDED"), "Split Recommended");

  const draftCase: CommerceCase = {
    ...createCommerceCase({
      title: "Case",
      buyer: "0xb",
      seller: "0xs",
      agreementText: "Agreement text long enough for this domain test",
      acceptanceCriteria: ["done"],
      amountReference: 100,
    }),
    status: "DRAFT",
  };

  assert.equal(getNextAction(draftCase), "Activate agreement");
});
