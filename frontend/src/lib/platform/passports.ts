import { createHash } from "node:crypto";

import { buildTrustPassports } from "../lexnet-domain";
import type { CommerceCase, TrustPassport } from "../lexnet-types";
import type { PublishedPassport, PublicPassportView } from "./types";

export function buildPublishedPassports(
  cases: CommerceCase[],
  workspaceId: string,
  updatedAt = new Date().toISOString(),
): PublishedPassport[] {
  return buildTrustPassports(cases)
    .filter((passport) => passport.verifiedCases > 0)
    .map((passport) => toPublishedPassport(passport, cases, workspaceId, updatedAt));
}

export function buildPublicPassportView(
  passport: PublishedPassport,
): PublicPassportView {
  if (!passport.publishedAt) {
    throw new Error("Cannot build public view for unpublished passport");
  }

  return {
    slug: passport.slug,
    party: redactSubject(passport.party),
    role: passport.role,
    trustLevel: passport.trustLevel,
    totalCases: passport.totalCases,
    verifiedCases: passport.verifiedCases,
    averageScore: passport.averageScore,
    totalReferencedValue: getValueBand(passport.totalReferencedValue),
    riskFlags: [...passport.riskFlags],
    publishedAt: passport.publishedAt,
    updatedAt: passport.updatedAt,
  };
}

export function findPublicPassport(
  passports: PublishedPassport[],
  slug: string,
): PublicPassportView | null {
  const passport = passports.find(
    (candidate) => candidate.slug === slug && Boolean(candidate.publishedAt),
  );

  return passport ? buildPublicPassportView(passport) : null;
}

function toPublishedPassport(
  passport: TrustPassport,
  cases: CommerceCase[],
  workspaceId: string,
  updatedAt: string,
): PublishedPassport {
  return {
    id: `passport-${buildSlug(passport)}`,
    slug: buildSlug(passport),
    workspaceId,
    party: passport.party,
    role: passport.role,
    trustLevel: passport.trustLevel,
    totalCases: passport.totalCases,
    verifiedCases: passport.verifiedCases,
    averageScore: passport.averageScore,
    totalReferencedValue: passport.totalReferencedValue,
    riskFlags: [...passport.riskFlags],
    caseIds: getPassportCaseIds(passport, cases),
    publishedAt: "",
    updatedAt,
  };
}

function buildSlug(passport: TrustPassport): string {
  const role = passport.role;
  const partyPrefix = passport.party.slice(0, 6).toLowerCase();
  const digest = buildSubjectKey(role, passport.party).slice(0, 8);

  return `${role}-${partyPrefix}-lexnet-${digest}`;
}

export function buildSubjectKey(role: TrustPassport["role"], party: string): string {
  return createHash("sha256")
    .update(`${role}:${party}`)
    .digest("hex");
}

export function redactSubject(party: string): string {
  if (party.length <= 10) {
    return party;
  }

  return `${party.slice(0, 6)}...${party.slice(-4)}`;
}

function getValueBand(value: number): string {
  if (value < 1000) {
    return "<$1k";
  }
  if (value < 5000) {
    return "$1k-$5k";
  }
  if (value < 10000) {
    return "$5k-$10k";
  }
  return "$10k+";
}

function getPassportCaseIds(
  passport: TrustPassport,
  cases: CommerceCase[],
): string[] {
  return cases
    .filter(
      (commerceCase) =>
        commerceCase.verificationReport &&
        (passport.role === "buyer"
          ? commerceCase.buyer === passport.party
          : commerceCase.seller === passport.party),
    )
    .map((commerceCase) => commerceCase.id)
    .sort();
}
