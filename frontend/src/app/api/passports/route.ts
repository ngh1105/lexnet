import { buildPublishedPassports } from "@/lib/platform/passports";
import {
  checkRateLimit,
  jsonError,
  jsonOk,
  readJsonBody,
} from "@/lib/platform/api";
import { authorizeDemoPrivateApi, authorizePlatformMutation } from "@/lib/platform/auth";
import { mutatePlatformStore, readPlatformStore, toSafePassportRecord, toSafePassportRecords } from "@/lib/platform/store";
import type { PublishedPassport } from "@/lib/platform/types";

export async function GET(request: Request) {
  const store = await readPlatformStore();
  const authorization = authorizeDemoPrivateApi(request, process.env, store);
  if (!authorization.authorized) {
    return authorization.response;
  }

  return jsonOk(toSafePassportRecords(store.publishedPassports));
}

export async function POST(request: Request) {
  const currentStore = await readPlatformStore();
  const authorization = await authorizePlatformMutation(request, process.env, currentStore);
  if (!authorization.authorized) {
    return authorization.response;
  }

  const rateLimit = checkRateLimit("passports-generate");
  if (!rateLimit.allowed) {
    return jsonError("Rate limit exceeded.", 429);
  }

  const updatedAt = new Date().toISOString();
  const store = await mutatePlatformStore((draft) => {
    const generated = buildPublishedPassports(
      draft.cases,
      "workspace-demo",
      updatedAt,
    );
    const existingBySlug = new Map(
      draft.publishedPassports.map((passport) => [passport.slug, passport]),
    );

    draft.publishedPassports = generated.map((passport) => {
      const existing = existingBySlug.get(passport.slug);
      return existing
        ? {
            ...passport,
            status: existing.status,
            publishedAt: existing.publishedAt,
            updatedAt,
          }
        : passport;
    });

    draft.auditEvents.push({
      id: `audit-${updatedAt.replace(/\D/g, "")}-passport-generated`,
      type: "passport.generated",
      actorId: authorization.operator.id,
      entityType: "passport",
      entityId: "published-passports",
      detail: "Generated published passport records",
      createdAt: updatedAt,
    });
  });

  return jsonOk(toSafePassportRecords(store.publishedPassports));
}

export async function PATCH(request: Request) {
  const currentStore = await readPlatformStore();
  const authorization = await authorizePlatformMutation(request, process.env, currentStore);
  if (!authorization.authorized) {
    return authorization.response;
  }

  const body = await readJsonBody<{ slug?: string; published?: boolean }>(request);
  if (!body || typeof body.slug !== "string" || typeof body.published !== "boolean") {
    return jsonError("Passport slug and published boolean are required.");
  }

  const rateLimit = checkRateLimit(`passport-publish:${body.slug}`);
  if (!rateLimit.allowed) {
    return jsonError("Rate limit exceeded.", 429);
  }

  let passport: PublishedPassport | undefined;
  const updatedAt = new Date().toISOString();
  await mutatePlatformStore((draft) => {
    const target = draft.publishedPassports.find(
      (candidate) => candidate.slug === body.slug,
    );
    if (!target) {
      return;
    }

    target.status = body.published ? "published" : "draft";
    target.publishedAt = body.published ? target.publishedAt || updatedAt : "";
    target.updatedAt = updatedAt;
    passport = { ...target, riskFlags: [...target.riskFlags], caseIds: [...target.caseIds] };

    draft.auditEvents.push({
      id: `audit-${updatedAt.replace(/\D/g, "")}-${body.published ? "passport-published" : "passport-unpublished"}`,
      type: body.published ? "passport.published" : "passport.unpublished",
      actorId: authorization.operator.id,
      entityType: "passport",
      entityId: target.slug,
      detail: body.published ? "Published trust passport" : "Unpublished trust passport",
      createdAt: updatedAt,
    });
  });

  if (!passport) {
    return jsonError("Passport not found.", 404);
  }

  return jsonOk({ passport: toSafePassportRecord(passport) });
}
