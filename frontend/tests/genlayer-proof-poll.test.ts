import { test } from "node:test";
import assert from "node:assert/strict";
import { pollGenLayerProof } from "../src/lib/genlayer-proof-poll";

test("pollGenLayerProof returns verified: true when verification_report appears after retries", async () => {
  let callCount = 0;
  const mockFetcher = async () => {
    callCount++;
    const hasReport = callCount >= 3;
    return {
      ok: true,
      json: async () => ({
        result: {
          parsedCase: hasReport
            ? { verification_report: { summary: "All good" } }
            : {},
        },
      }),
    } as Response;
  };

  const result = await pollGenLayerProof({
    caseId: "case-1",
    fetcher: mockFetcher as typeof fetch,
    intervalMs: 0,
    maxAttempts: 6,
  });

  assert.equal(result.verified, true);
  assert.deepEqual(result.verificationReport, { summary: "All good" });
  assert.equal(callCount, 3);
});

test("pollGenLayerProof returns verified: false after maxAttempts when proof never arrives", async () => {
  let callCount = 0;
  const mockFetcher = async () => {
    callCount++;
    return {
      ok: true,
      json: async () => ({
        result: { parsedCase: {} },
      }),
    } as Response;
  };

  const result = await pollGenLayerProof({
    caseId: "case-2",
    fetcher: mockFetcher as typeof fetch,
    intervalMs: 0,
    maxAttempts: 4,
  });

  assert.equal(result.verified, false);
  assert.equal(result.verificationReport, undefined);
  assert.equal(callCount, 4);
});

test("pollGenLayerProof returns verified: false when signal is aborted mid-poll", async () => {
  const controller = new AbortController();
  let callCount = 0;

  const mockFetcher = async () => {
    callCount++;
    if (callCount === 2) {
      controller.abort();
    }
    return {
      ok: true,
      json: async () => ({
        result: { parsedCase: {} },
      }),
    } as Response;
  };

  const result = await pollGenLayerProof({
    caseId: "case-3",
    fetcher: mockFetcher as typeof fetch,
    intervalMs: 0,
    maxAttempts: 6,
    signal: controller.signal,
  });

  assert.equal(result.verified, false);
  assert.ok(callCount <= 3, `Expected callCount <= 3, got ${callCount}`);
});
