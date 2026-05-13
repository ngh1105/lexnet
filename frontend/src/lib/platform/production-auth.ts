import { createHmac, timingSafeEqual } from "node:crypto";

export type ProductionAuthMode = "trusted-header";

export interface ProductionAuthEnv {
  [key: string]: string | undefined;
  LEXNET_PRODUCTION_AUTH_MODE?: string;
  LEXNET_PRODUCTION_AUTH_SECRET?: string;
  LEXNET_PRODUCTION_AUTH_CLOCK_SKEW_SECONDS?: string;
}

export interface ProductionAuthSignatureInput {
  method: string;
  pathname: string;
  operatorId: string;
  timestamp: string;
  secret: string;
}

export type ProductionAuthFailureCode =
  | "mode_not_configured"
  | "secret_not_configured"
  | "missing_headers"
  | "invalid_timestamp"
  | "stale_timestamp"
  | "invalid_signature";

export type ProductionAuthContext =
  | { authorized: true; mode: ProductionAuthMode; operatorId: string }
  | { authorized: false; status: number; code: ProductionAuthFailureCode; reason: string };

const DEFAULT_CLOCK_SKEW_SECONDS = 300;

export function buildProductionAuthPayload({
  method,
  pathname,
  operatorId,
  timestamp,
}: Omit<ProductionAuthSignatureInput, "secret">): string {
  return [method.toUpperCase(), pathname, operatorId, timestamp].join("\n");
}

export function buildProductionAuthSignature(input: ProductionAuthSignatureInput): string {
  return createHmac("sha256", input.secret)
    .update(buildProductionAuthPayload(input))
    .digest("hex");
}

function parseClockSkew(env: ProductionAuthEnv): number {
  const parsed = Number(env.LEXNET_PRODUCTION_AUTH_CLOCK_SKEW_SECONDS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_CLOCK_SKEW_SECONDS;
}

function signaturesMatch(expected: string, actual: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(actual)) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(actual, "hex");
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

export function isProductionAuthConfigured(env: ProductionAuthEnv): boolean {
  return env.LEXNET_PRODUCTION_AUTH_MODE === "trusted-header" && Boolean(env.LEXNET_PRODUCTION_AUTH_SECRET);
}

export function resolveProductionAuthContext(
  request: Request,
  env: ProductionAuthEnv,
  nowSeconds = Math.floor(Date.now() / 1000),
): ProductionAuthContext {
  if (env.LEXNET_PRODUCTION_AUTH_MODE !== "trusted-header") {
    return {
      authorized: false,
      status: 403,
      code: "mode_not_configured",
      reason: "Production authentication mode is not configured.",
    };
  }

  const secret = env.LEXNET_PRODUCTION_AUTH_SECRET;
  if (!secret) {
    return {
      authorized: false,
      status: 403,
      code: "secret_not_configured",
      reason: "Production authentication secret is not configured.",
    };
  }

  const operatorId = request.headers.get("x-lexnet-production-operator-id") ?? "";
  const timestamp = request.headers.get("x-lexnet-production-auth-timestamp") ?? "";
  const signature = request.headers.get("x-lexnet-production-auth-signature") ?? "";

  if (!operatorId || !timestamp || !signature) {
    return {
      authorized: false,
      status: 401,
      code: "missing_headers",
      reason: "Production authentication headers are required.",
    };
  }

  const timestampSeconds = Number(timestamp);
  if (!Number.isInteger(timestampSeconds)) {
    return {
      authorized: false,
      status: 401,
      code: "invalid_timestamp",
      reason: "Production authentication timestamp is invalid.",
    };
  }

  if (Math.abs(nowSeconds - timestampSeconds) > parseClockSkew(env)) {
    return {
      authorized: false,
      status: 401,
      code: "stale_timestamp",
      reason: "Production authentication timestamp is outside the allowed window.",
    };
  }

  const { pathname } = new URL(request.url);
  const expected = buildProductionAuthSignature({
    method: request.method,
    pathname,
    operatorId,
    timestamp,
    secret,
  });

  if (!signaturesMatch(expected, signature)) {
    return {
      authorized: false,
      status: 401,
      code: "invalid_signature",
      reason: "Production authentication signature is invalid.",
    };
  }

  return { authorized: true, mode: "trusted-header", operatorId };
}
