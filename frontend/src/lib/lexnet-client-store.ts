import {
  applyVerificationReport,
  appendEvidenceToCase,
  createCommerceCase,
} from "./lexnet-domain";
import { buildLocalVerificationReport } from "./lexnet-verification";
import type {
  CommerceCase,
  CreateCommerceCaseInput,
  CreateCommerceCaseOptions,
} from "./lexnet-types";

export const LEXNET_CASES_STORAGE_KEY = "lexnet.commerceCases.v1";

export interface VerifyStoredCaseOptions {
  reviewedAt?: string;
}

export function getMergedCommerceCases(
  seedCases: CommerceCase[],
  storage: Storage | null = getBrowserStorage()
): CommerceCase[] {
  const byId = new Map<string, CommerceCase>();

  for (const commerceCase of seedCases) {
    byId.set(commerceCase.id, cloneCase(commerceCase));
  }
  for (const commerceCase of loadStoredCommerceCases(storage)) {
    byId.set(commerceCase.id, cloneCase(commerceCase));
  }

  return Array.from(byId.values()).sort(sortNewestFirst);
}

export function createStoredCommerceCase(
  seedCases: CommerceCase[],
  storage: Storage | null,
  input: CreateCommerceCaseInput,
  options: CreateCommerceCaseOptions = {}
): CommerceCase {
  const commerceCase = createCommerceCase(input, options);
  persistCase(seedCases, storage, commerceCase);
  return commerceCase;
}

export function submitStoredEvidence(
  seedCases: CommerceCase[],
  storage: Storage | null,
  caseId: string,
  urls: string[]
): CommerceCase | null {
  const commerceCase = getMergedCommerceCases(seedCases, storage).find(
    (candidate) => candidate.id === caseId
  );
  if (!commerceCase) {
    return null;
  }

  const updatedCase = appendEvidenceToCase(commerceCase, urls);
  persistCase(seedCases, storage, updatedCase);
  return updatedCase;
}

export async function verifyStoredCommerceCase(
  seedCases: CommerceCase[],
  storage: Storage | null,
  caseId: string,
  options: VerifyStoredCaseOptions = {}
): Promise<CommerceCase | null> {
  const commerceCase = getMergedCommerceCases(seedCases, storage).find(
    (candidate) => candidate.id === caseId
  );
  if (!commerceCase) {
    return null;
  }

  const report = buildLocalVerificationReport(commerceCase, options.reviewedAt);
  const updatedCase = applyVerificationReport(commerceCase, report);
  persistCase(seedCases, storage, updatedCase);
  return updatedCase;
}

export function loadStoredCommerceCases(
  storage: Storage | null = getBrowserStorage()
): CommerceCase[] {
  if (!storage) {
    return [];
  }

  try {
    const rawValue = storage.getItem(LEXNET_CASES_STORAGE_KEY);
    if (!rawValue) {
      return [];
    }
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isCommerceCase);
  } catch {
    return [];
  }
}

function persistCase(
  seedCases: CommerceCase[],
  storage: Storage | null,
  commerceCase: CommerceCase
) {
  if (!storage) {
    return;
  }

  const localCases = loadStoredCommerceCases(storage);
  const seedIds = new Set(seedCases.map((seedCase) => seedCase.id));
  const byId = new Map<string, CommerceCase>();

  for (const localCase of localCases) {
    byId.set(localCase.id, localCase);
  }

  byId.set(commerceCase.id, commerceCase);

  const casesToStore = Array.from(byId.values()).filter(
    (candidate) => !seedIds.has(candidate.id) || candidate.id === commerceCase.id
  );

  storage.setItem(
    LEXNET_CASES_STORAGE_KEY,
    JSON.stringify(casesToStore.sort(sortNewestFirst))
  );
}

function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage;
}

function sortNewestFirst(left: CommerceCase, right: CommerceCase): number {
  return right.createdAt.localeCompare(left.createdAt);
}

function cloneCase(commerceCase: CommerceCase): CommerceCase {
  return {
    ...commerceCase,
    acceptanceCriteria: [...commerceCase.acceptanceCriteria],
    evidence: commerceCase.evidence.map((item) => ({ ...item })),
    verificationReport: commerceCase.verificationReport
      ? {
          ...commerceCase.verificationReport,
          riskFlags: [...(commerceCase.verificationReport.riskFlags ?? [])],
        }
      : null,
  };
}

function isCommerceCase(value: unknown): value is CommerceCase {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<CommerceCase>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.buyer === "string" &&
    typeof candidate.seller === "string" &&
    typeof candidate.agreementText === "string" &&
    Array.isArray(candidate.acceptanceCriteria) &&
    typeof candidate.amountReference === "number" &&
    typeof candidate.status === "string" &&
    Array.isArray(candidate.evidence) &&
    typeof candidate.createdAt === "string"
  );
}
