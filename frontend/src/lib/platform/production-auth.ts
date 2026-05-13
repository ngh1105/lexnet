import { createHash, createHmac, timingSafeEqual } from "node:crypto";

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
  queryString?: string;
  operatorId: string;
  timestamp: string;
  nonce: string;
  bodySha256Hex?: string;
  secret: string;
}

export type ProductionAuthFailureCode =
  | "mode_not_configured"
  | "secret_not_configured"
  | "missing_headers"
  | "invalid_timestamp"
  | "stale_timestamp"
  | "replayed_nonce"
  | "invalid_signature";

export type ProductionAuthContext =
  | { authorized: true; mode: ProductionAuthMode; operatorId: string }
  | { authorized: false; status: number; code: ProductionAuthFailureCode; reason: string };

const DEFAULT_CLOCK_SKEW_SECONDS = 60;
const EMPTY_BODY_SHA256_HEX = createHash("sha256").update("").digest("hex");
const seenNonces = new Map<string, number>();

export function buildProductionAuthPayload({
  method,
  pathname,
  queryString = "",
  operatorId,
  timestamp,
  nonce,
  bodySha256Hex = EMPTY_BODY_SHA256_HEX,
}: Omit<ProductionAuthSignatureInput, "secret">): string {
  return [method.toUpperCase(), pathname, queryString, operatorId, timestamp, nonce, bodySha256Hex].join("\n");
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

function consumeNonce(nonce: string, nowSeconds: number, clockSkewSeconds: number): boolean {
  for (const [seenNonce, expiresAt] of seenNonces) {
    if (expiresAt <= nowSeconds) {
      seenNonces.delete(seenNonce);
    }
  }

  if (seenNonces.has(nonce)) {
    return false;
  }

  seenNonces.set(nonce, nowSeconds + clockSkewSeconds);
  return true;
}

export function resetProductionAuthNonceCacheForTests(): void {
  seenNonces.clear();
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
  const nonce = request.headers.get("x-lexnet-production-auth-nonce") ?? "";
  const bodySha256Hex = request.headers.get("x-lexnet-production-auth-body-sha256") ?? EMPTY_BODY_SHA256_HEX;
  const signature = request.headers.get("x-lexnet-production-auth-signature") ?? "";

  if (!operatorId || !timestamp || !nonce || !signature) {
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

  const clockSkewSeconds = parseClockSkew(env);
  if (Math.abs(nowSeconds - timestampSeconds) > clockSkewSeconds) {
    return {
      authorized: false,
      status: 401,
      code: "stale_timestamp",
      reason: "Production authentication timestamp is outside the allowed window.",
    };
  }

  const { pathname, search } = new URL(request.url);
  const expected = buildProductionAuthSignature({
    method: request.method,
    pathname,
    queryString: search.startsWith("?") ? search.slice(1) : search,
    operatorId,
    timestamp,
    nonce,
    bodySha256Hex,
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

  if (!consumeNonce(nonce, nowSeconds, clockSkewSeconds)) {
    return {
      authorized: false,
      status: 401,
      code: "replayed_nonce",
      reason: "Production authentication nonce has already been used.",
    };
  }

  return { authorized: true, mode: "trusted-header", operatorId };
}
