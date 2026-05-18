/**
 * Edge-compatible HMAC verification using Web Crypto API.
 * Mirrors production-auth.ts but works in Next.js middleware (Edge runtime).
 *
 * Uses crypto.subtle (available in Edge/Workers) instead of node:crypto.
 */

export interface EdgeAuthInput {
  method: string;
  pathname: string;
  queryString: string;
  operatorId: string;
  timestamp: string;
  nonce: string;
  bodySha256Hex: string;
  signature: string;
  secret: string;
  clockSkewSeconds: number;
}

export type EdgeAuthResult =
  | { authorized: true }
  | { authorized: false; status: number; reason: string };

const seenNonces = new Map<string, number>();

const EMPTY_BODY_SHA256_HEX =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

function buildPayload(
  input: Omit<EdgeAuthInput, "signature" | "secret" | "clockSkewSeconds">,
): string {
  return [
    input.method.toUpperCase(),
    input.pathname,
    input.queryString,
    input.operatorId,
    input.timestamp,
    input.nonce,
    input.bodySha256Hex,
  ].join("\n");
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("Invalid hex");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return out;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function verifyEdgeAuth(input: EdgeAuthInput): Promise<EdgeAuthResult> {
  // Format checks
  if (!/^[a-f0-9]{64}$/i.test(input.signature)) {
    return { authorized: false, status: 401, reason: "invalid_signature_format" };
  }
  const ts = Number(input.timestamp);
  if (!Number.isInteger(ts)) {
    return { authorized: false, status: 401, reason: "invalid_timestamp" };
  }

  // Clock skew check
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - ts) > input.clockSkewSeconds) {
    return { authorized: false, status: 401, reason: "stale_timestamp" };
  }

  // Replay check
  const nonceKey = `${input.operatorId}:${input.nonce}`;
  if (seenNonces.has(nonceKey)) {
    return { authorized: false, status: 401, reason: "replayed_nonce" };
  }

  // HMAC verify via Web Crypto
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(input.secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(buildPayload(input)),
  );
  const expected = new Uint8Array(sigBuffer);

  let actual: Uint8Array;
  try {
    actual = hexToBytes(input.signature);
  } catch {
    return { authorized: false, status: 401, reason: "invalid_signature_format" };
  }

  if (!timingSafeEqual(expected, actual)) {
    return { authorized: false, status: 401, reason: "invalid_signature" };
  }

  // Record nonce (TTL = 2 * clock skew)
  seenNonces.set(nonceKey, nowSeconds);

  // Cleanup expired nonces
  const cutoff = nowSeconds - 2 * input.clockSkewSeconds;
  for (const [k, t] of seenNonces) {
    if (t < cutoff) seenNonces.delete(k);
  }

  return { authorized: true };
}

export async function sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(data),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export { EMPTY_BODY_SHA256_HEX };

/** Reset nonce cache — test helper only. */
export function resetEdgeNonceCacheForTests(): void {
  seenNonces.clear();
}
