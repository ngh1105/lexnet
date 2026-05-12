import { rm } from "node:fs/promises";

import {
  appendEvidenceToCase,
  applyVerificationReport,
  createCommerceCase,
} from "../lexnet-domain";
import type { CommerceCase, CommerceCaseStatus, VerificationReport } from "../lexnet-types";
import { buildPublishedPassports } from "./passports";
import {
  DEFAULT_PLATFORM_STORE_PATH,
  writePlatformStore,
} from "./store";
import type { PlatformAuditEvent, PlatformStore } from "./types";

const WORKSPACE_ID = "workspace-demo-command-center";
const DEMO_BUYER = "0x4F9A00000000000000000000000000000000B001";
const DEMO_SELLER = "0x7ED2000000000000000000000000000000005001";
const NOW = "2026-05-12T12:00:00.000Z";

export function buildDemoPlatformStore(): PlatformStore {
  const cases = buildDemoCases();
  const publishedPassports = buildPublishedPassports(cases, WORKSPACE_ID, NOW).map((passport) => {
    if (
      (passport.role === "buyer" && passport.party === DEMO_BUYER) ||
      (passport.role === "seller" && passport.party === DEMO_SELLER)
    ) {
      return { ...passport, publishedAt: NOW };
    }

    return passport;
  });

  const auditEvents = buildAuditEvents(cases, publishedPassports);

  return {
    version: 1,
    workspaces: [
      {
        id: WORKSPACE_ID,
        name: "LexNet Pilot Command Center",
        slug: "pilot-command-center",
        createdAt: "2026-05-12T08:00:00.000Z",
        updatedAt: NOW,
      },
    ],
    operators: [
      {
        id: "operator-demo",
        name: "Demo Operator",
        walletAddress: "0x00000000000000000000000000000000000000D0",
        email: "operator@lexnet.local",
        createdAt: "2026-05-12T08:05:00.000Z",
        updatedAt: NOW,
      },
      {
        id: "operator-analyst",
        name: "Pilot Analyst",
        walletAddress: "0x00000000000000000000000000000000000000A1",
        email: "analyst@lexnet.local",
        createdAt: "2026-05-12T08:10:00.000Z",
        updatedAt: NOW,
      },
    ],
    memberships: [
      {
        id: "membership-demo-owner",
        workspaceId: WORKSPACE_ID,
        operatorId: "operator-demo",
        role: "owner",
        createdAt: "2026-05-12T08:05:00.000Z",
      },
      {
        id: "membership-analyst-operator",
        workspaceId: WORKSPACE_ID,
        operatorId: "operator-analyst",
        role: "operator",
        createdAt: "2026-05-12T08:10:00.000Z",
      },
    ],
    queue: [
      {
        id: "queue-demo-active",
        workspaceId: WORKSPACE_ID,
        caseId: "lx-case-demo-active",
        status: "pending",
        priority: "normal",
        assignedOperatorId: "operator-demo",
        createdAt: "2026-05-12T09:05:00.000Z",
        updatedAt: NOW,
      },
      {
        id: "queue-demo-evidence",
        workspaceId: WORKSPACE_ID,
        caseId: "lx-case-demo-evidence",
        status: "in_review",
        priority: "high",
        assignedOperatorId: "operator-analyst",
        createdAt: "2026-05-12T09:35:00.000Z",
        updatedAt: NOW,
      },
      {
        id: "queue-demo-revision",
        workspaceId: WORKSPACE_ID,
        caseId: "lx-case-demo-revision",
        status: "blocked",
        priority: "high",
        assignedOperatorId: "operator-demo",
        createdAt: "2026-05-12T10:35:00.000Z",
        updatedAt: NOW,
      },
      {
        id: "queue-demo-settlement",
        workspaceId: WORKSPACE_ID,
        caseId: "lx-case-demo-settlement",
        status: "completed",
        priority: "normal",
        assignedOperatorId: "operator-analyst",
        createdAt: "2026-05-12T11:35:00.000Z",
        updatedAt: NOW,
      },
    ],
    cases,
    publishedPassports,
    auditEvents,
    genLayerExecutions: [],
  };
}

export async function seedDemoPlatformStore(
  storePath = DEFAULT_PLATFORM_STORE_PATH,
): Promise<PlatformStore> {
  const store = buildDemoPlatformStore();
  await writePlatformStore(store, storePath);
  return store;
}

export async function resetDemoPlatformStore(
  storePath = DEFAULT_PLATFORM_STORE_PATH,
): Promise<void> {
  await rm(storePath, { force: true });
}

export function getDemoSeedPublicPassportSlugs(
  store = buildDemoPlatformStore(),
): string[] {
  return store.publishedPassports
    .filter((passport) => Boolean(passport.publishedAt))
    .map((passport) => passport.slug)
    .sort();
}

function buildDemoCases(): CommerceCase[] {
  return [
    buildCase({
      id: "lx-case-demo-active",
      title: "Active electronics shipment escrow",
      buyer: DEMO_BUYER,
      seller: DEMO_SELLER,
      amountReference: 8400,
      createdAt: "2026-05-12T09:00:00.000Z",
      status: "ACTIVE",
    }),
    buildCase({
      id: "lx-case-demo-evidence",
      title: "Evidence submitted marketplace delivery",
      buyer: "0x4F9A00000000000000000000000000000000B002",
      seller: DEMO_SELLER,
      amountReference: 6200,
      createdAt: "2026-05-12T09:30:00.000Z",
      status: "EVIDENCE_SUBMITTED",
      evidence: ["https://demo.lexnet.local/evidence/marketplace-delivery.pdf"],
    }),
    buildCase({
      id: "lx-case-demo-review",
      title: "AI review SaaS onboarding milestone",
      buyer: DEMO_BUYER,
      seller: "0x7ED2000000000000000000000000000000005002",
      amountReference: 12300,
      createdAt: "2026-05-12T10:00:00.000Z",
      status: "UNDER_AI_REVIEW",
      evidence: [
        "https://github.com/lexnet-demo/onboarding-milestone",
        "https://demo.lexnet.local/evidence/onboarding-checklist.pdf",
      ],
    }),
    buildCase({
      id: "lx-case-demo-verified",
      title: "Verified wholesale inventory handoff",
      buyer: DEMO_BUYER,
      seller: DEMO_SELLER,
      amountReference: 17400,
      createdAt: "2026-05-12T10:30:00.000Z",
      status: "VERIFIED",
      evidence: ["https://demo.lexnet.local/evidence/warehouse-receipt.pdf"],
      report: localReport("APPROVE", 93, "Evidence supports completed inventory handoff.", "Operator may prepare settlement recommendation.", 10000, "2026-05-12T11:00:00.000Z"),
    }),
    buildCase({
      id: "lx-case-demo-revision",
      title: "Revision requested creator deliverable",
      buyer: "0x4F9A00000000000000000000000000000000B003",
      seller: DEMO_SELLER,
      amountReference: 3800,
      createdAt: "2026-05-12T11:00:00.000Z",
      status: "REVISION_REQUESTED",
      evidence: ["https://demo.lexnet.local/evidence/creator-deliverable.pdf"],
      report: localReport("REVISE", 68, "Evidence is reviewable but missing acceptance detail.", "Request corrected public proof of completion.", 0, "2026-05-12T11:20:00.000Z", ["missing-acceptance-detail"]),
    }),
    buildCase({
      id: "lx-case-demo-settlement",
      title: "Settlement recommended logistics lane",
      buyer: DEMO_BUYER,
      seller: DEMO_SELLER,
      amountReference: 21100,
      createdAt: "2026-05-12T11:30:00.000Z",
      status: "SETTLEMENT_RECOMMENDED",
      evidence: [
        "https://demo.lexnet.local/evidence/logistics-lane.pdf",
        "https://demo.lexnet.local/evidence/carrier-confirmation",
      ],
      report: localReport("SPLIT_RECOMMENDED", 82, "Delivery evidence supports a split settlement recommendation.", "Review proposed allocation before any external action.", 8500, "2026-05-12T11:50:00.000Z"),
    }),
  ];
}

function buildCase(input: {
  id: string;
  title: string;
  buyer: string;
  seller: string;
  amountReference: number;
  createdAt: string;
  status: CommerceCaseStatus;
  evidence?: string[];
  report?: VerificationReport;
}): CommerceCase {
  let commerceCase = createCommerceCase(
    {
      title: input.title,
      buyer: input.buyer,
      seller: input.seller,
      agreementText: `${input.title} agreement text for a deterministic public demo workflow with safe sample data only.`,
      acceptanceCriteria: ["Public evidence is available", "Operator review is complete when applicable"],
      amountReference: input.amountReference,
    },
    { id: input.id, createdAt: input.createdAt },
  );

  if (input.evidence?.length) {
    commerceCase = appendEvidenceToCase(commerceCase, input.evidence);
  }

  if (input.report) {
    commerceCase = applyVerificationReport(commerceCase, input.report);
  }

  return { ...commerceCase, status: input.status };
}

function localReport(
  verdict: VerificationReport["verdict"],
  score: number,
  summary: string,
  recommendation: string,
  sellerShareBps: number,
  reviewedAt: string,
  riskFlags: string[] = [],
): VerificationReport {
  return {
    verdict,
    score,
    summary,
    recommendation,
    sellerShareBps,
    reviewedAt,
    riskFlags,
    source: "local",
  };
}

function buildAuditEvents(
  cases: CommerceCase[],
  passports: PlatformStore["publishedPassports"],
): PlatformAuditEvent[] {
  const events: PlatformAuditEvent[] = [];

  for (const [index, commerceCase] of cases.entries()) {
    const createdAt = `2026-05-12T12:${String(index).padStart(2, "0")}:00.000Z`;
    events.push({
      id: `audit-demo-case-${commerceCase.id}`,
      type: "case.created",
      actorId: "operator-demo",
      entityType: "case",
      entityId: commerceCase.id,
      detail: `Created demo case ${commerceCase.id}`,
      createdAt,
    });

    if (commerceCase.evidence.length > 0) {
      events.push({
        id: `audit-demo-evidence-${commerceCase.id}`,
        type: "evidence.submitted",
        actorId: "operator-analyst",
        entityType: "evidence",
        entityId: commerceCase.id,
        detail: `Registered ${commerceCase.evidence.length} public demo evidence item(s)`,
        createdAt,
      });
    }

    if (commerceCase.verificationReport) {
      events.push({
        id: `audit-demo-verification-${commerceCase.id}`,
        type: "verification.generated",
        actorId: "operator-demo",
        entityType: "report",
        entityId: commerceCase.id,
        detail: "Generated local demo verification report",
        createdAt,
      });
    }
  }

  for (const passport of passports) {
    events.push({
      id: `audit-demo-passport-generated-${passport.slug}`,
      type: "passport.generated",
      actorId: "operator-demo",
      entityType: "passport",
      entityId: passport.id,
      detail: `Generated demo ${passport.role} passport`,
      createdAt: NOW,
    });

    if (passport.publishedAt) {
      events.push({
        id: `audit-demo-passport-published-${passport.slug}`,
        type: "passport.published",
        actorId: "operator-demo",
        entityType: "passport",
        entityId: passport.id,
        detail: `Published demo ${passport.role} passport`,
        createdAt: passport.publishedAt,
      });
    }
  }

  return events;
}
