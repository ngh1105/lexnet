import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import {
  verifyEdgeAuth,
  resetEdgeNonceCacheForTests,
  type EdgeAuthInput,
} from "../src/lib/platform/production-auth-edge";

const TEST_SECRET = "test-secret-key-for-hmac-verification";
const CLOCK_SKEW = 60;

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function buildPayload(input: Omit<EdgeAuthInput, "signature" | "secret" | "clockSkewSeconds">): string {
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

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function makeValidInput(overrides: Partial<EdgeAuthInput> = {}): EdgeAuthInput {
  const base: Omit<EdgeAuthInput, "signature" | "secret" | "clockSkewSeconds"> = {
    method: "GET",
    pathname: "/api/cases",
    queryString: "",
    operatorId: "operator-1",
    timestamp: String(nowSeconds()),
    nonce: `nonce-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    bodySha256Hex: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  };

  const merged = { ...base, ...overrides };
  const payload = buildPayload(merged);
  const signature = overrides.signature ?? sign(payload, overrides.secret ?? TEST_SECRET);

  return {
    ...merged,
    signature,
    secret: TEST_SECRET,
    clockSkewSeconds: CLOCK_SKEW,
    ...overrides,
  };
}

test("production-auth-edge", async (t) => {
  t.beforeEach(() => {
    resetEdgeNonceCacheForTests();
  });

  await t.test("valid signature + fresh timestamp + new nonce → authorized", async () => {
    const input = makeValidInput();
    const result = await verifyEdgeAuth(input);
    assert.deepEqual(result, { authorized: true });
  });

  await t.test("invalid signature → unauthorized with reason invalid_signature", async () => {
    const input = makeValidInput({
      signature: "a".repeat(64), // valid hex format but wrong HMAC
    });
    const result = await verifyEdgeAuth(input);
    assert.equal(result.authorized, false);
    if (!result.authorized) {
      assert.equal(result.reason, "invalid_signature");
      assert.equal(result.status, 401);
    }
  });

  await t.test("stale timestamp (>skew) → reason stale_timestamp", async () => {
    const staleTs = String(nowSeconds() - CLOCK_SKEW - 10);
    const input = makeValidInput({ timestamp: staleTs });
    // Re-sign with the stale timestamp
    const payload = buildPayload({
      method: input.method,
      pathname: input.pathname,
      queryString: input.queryString,
      operatorId: input.operatorId,
      timestamp: staleTs,
      nonce: input.nonce,
      bodySha256Hex: input.bodySha256Hex,
    });
    input.signature = sign(payload, TEST_SECRET);

    const result = await verifyEdgeAuth(input);
    assert.equal(result.authorized, false);
    if (!result.authorized) {
      assert.equal(result.reason, "stale_timestamp");
      assert.equal(result.status, 401);
    }
  });

  await t.test("replayed nonce → reason replayed_nonce", async () => {
    const input = makeValidInput();
    const first = await verifyEdgeAuth(input);
    assert.equal(first.authorized, true);

    // Same nonce again
    const second = await verifyEdgeAuth(input);
    assert.equal(second.authorized, false);
    if (!second.authorized) {
      assert.equal(second.reason, "replayed_nonce");
      assert.equal(second.status, 401);
    }
  });

  await t.test("malformed hex signature → reason invalid_signature_format", async () => {
    const input = makeValidInput({ signature: "not-valid-hex-at-all" });
    const result = await verifyEdgeAuth(input);
    assert.equal(result.authorized, false);
    if (!result.authorized) {
      assert.equal(result.reason, "invalid_signature_format");
      assert.equal(result.status, 401);
    }
  });

  await t.test("signature too short (valid hex but not 64 chars) → invalid_signature_format", async () => {
    const input = makeValidInput({ signature: "abcdef1234" });
    const result = await verifyEdgeAuth(input);
    assert.equal(result.authorized, false);
    if (!result.authorized) {
      assert.equal(result.reason, "invalid_signature_format");
      assert.equal(result.status, 401);
    }
  });
});
