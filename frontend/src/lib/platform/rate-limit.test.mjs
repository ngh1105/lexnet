import assert from "node:assert/strict";
import { test } from "node:test";
import { rateLimit, rateLimitByIp } from "./rate-limit.ts";

test("allows requests within limit", () => {
  const result = rateLimit("test:allow", { maxRequests: 3, windowMs: 1000 });
  assert.equal(result.allowed, true);
  assert.equal(result.remaining, 2);
});

test("blocks requests exceeding limit", () => {
  const key = "test:block:" + Date.now();
  rateLimit(key, { maxRequests: 2, windowMs: 10000 });
  rateLimit(key, { maxRequests: 2, windowMs: 10000 });
  const result = rateLimit(key, { maxRequests: 2, windowMs: 10000 });
  assert.equal(result.allowed, false);
  assert.equal(result.remaining, 0);
});

test("resets after window expires", async () => {
  const key = "test:reset:" + Date.now();
  rateLimit(key, { maxRequests: 1, windowMs: 5 });
  await new Promise((r) => setTimeout(r, 10));
  const result = rateLimit(key, { maxRequests: 1, windowMs: 5 });
  assert.equal(result.allowed, true);
});

test("rateLimitByIp extracts IP from headers", () => {
  const request = new Request("http://localhost", { headers: { "x-forwarded-for": "1.2.3.4" } });
  const result = rateLimitByIp(request, { maxRequests: 5, windowMs: 1000 });
  assert.equal(result.allowed, true);
});
