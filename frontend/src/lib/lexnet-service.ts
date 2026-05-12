import {
  buildEvidencePack,
} from "./lexnet-domain";
import { isLexNetContractReady } from "./lexnet-contract";
import { getPlatformCommerceCases } from "./platform/store";
import type { CommerceCase } from "./lexnet-types";

export type LexNetRuntimeMode = "local" | "contract-configured";

const CASES: CommerceCase[] = [
  {
    id: "lx-case-003",
    title: "Design asset delivery",
    buyer: "0x8F6A2cBf1A8e19D35D7c821a2D9b2F339D51cA77",
    seller: "0xA6F41e2C77E8106B8bD906E5aF2f9E3dC9e33409",
    agreementText:
      "Deliver a complete product launch design kit including social banners, hero artwork, logo variants, and a handoff document with editable source links.",
    acceptanceCriteria: [
      "Evidence must include public preview links for the final assets.",
      "The handoff must include editable source files or source project access.",
      "Final assets must match the requested launch campaign tone and dimensions.",
    ],
    amountReference: 3200,
    status: "SETTLEMENT_RECOMMENDED",
    evidence: buildEvidencePack([
      "https://example.com/launch-kit-preview",
      "https://docs.google.com/document/d/design-handoff",
    ]).items,
    createdAt: "2026-05-10T08:00:00.000Z",
    verificationReport: {
      verdict: "SPLIT_RECOMMENDED",
      score: 74,
      summary:
        "The asset set satisfies the core launch kit requirements, but the editable source handoff is incomplete for two banner sizes.",
      recommendation:
        "Release 75% to the seller and keep 25% available until the missing editable assets are delivered.",
      sellerShareBps: 7500,
      reviewedAt: "2026-05-10T09:30:00.000Z",
    },
  },
  {
    id: "lx-case-002",
    title: "API integration delivery",
    buyer: "0x6E56bbf447e84d52B3314c12D7B77f3439E05C67",
    seller: "0x75E0e2C69c1d5f5330E53D6f3a94497FA43D38e4",
    agreementText:
      "Implement a production-ready billing API integration with documented webhook handling, retry behavior, and a deployment handoff for the buyer engineering team.",
    acceptanceCriteria: [
      "Repository evidence must include integration source code.",
      "Documentation must explain webhook retries and failure handling.",
      "Delivery must include a deployed test endpoint or reproducible local setup.",
    ],
    amountReference: 5800,
    status: "EVIDENCE_SUBMITTED",
    evidence: buildEvidencePack([
      "https://github.com/acme/billing-integration",
      "https://example.com/billing-api-demo",
    ]).items,
    createdAt: "2026-05-10T07:30:00.000Z",
    verificationReport: null,
  },
  {
    id: "lx-case-001",
    title: "SaaS landing page delivery",
    buyer: "0x1A53E826b4a9829b46d233877037Bb4FfAb0e889",
    seller: "0x9C11CBc77C68fD4c9dfb732d7Ac78d941a215690",
    agreementText:
      "Build and deliver a responsive SaaS landing page with a hero section, pricing cards, feature blocks, lead capture form, and deployment handoff.",
    acceptanceCriteria: [
      "Page must render well on desktop and mobile.",
      "Lead capture form must validate required fields.",
      "Evidence must include deployed URL and source repository.",
    ],
    amountReference: 2400,
    status: "ACTIVE",
    evidence: [],
    createdAt: "2026-05-10T06:00:00.000Z",
    verificationReport: null,
  },
];

export function getRuntimeMode(): LexNetRuntimeMode {
  return isLexNetContractReady() ? "contract-configured" : "local";
}

export function getSeedCommerceCases(): CommerceCase[] {
  return CASES;
}

export async function getAllCommerceCases(): Promise<CommerceCase[]> {
  return getPlatformCommerceCases(CASES);
}

export async function getCommerceCase(
  caseId: string
): Promise<CommerceCase | null> {
  const commerceCases = await getAllCommerceCases();
  return commerceCases.find((commerceCase) => commerceCase.id === caseId) ?? null;
}
