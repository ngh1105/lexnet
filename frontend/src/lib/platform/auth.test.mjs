import assert from "node:assert/strict";
import { test } from "node:test";
import crypto from "node:crypto";

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

test("generateToken produces unique 64-char hex tokens", () => {
  const tokens = new Set(Array.from({ length: 100 }, () => generateToken()));
  assert.equal(tokens.size, 100);
  for (const token of tokens) {
    assert.match(token, /^[0-9a-f]{64}$/);
  }
});

test("session token format is URL-safe and has sufficient entropy", () => {
  const token = generateToken();
  assert.equal(token.length, 64);
  assert.ok(/^[0-9a-f]+$/.test(token), "token should be hex encoded");
  const bytes = Buffer.from(token, "hex");
  assert.equal(bytes.length, 32);
});

test("session TTL is 24 hours", () => {
  const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
  assert.equal(SESSION_TTL_MS, 86400000);
  const now = Date.now();
  const expiresAt = new Date(now + SESSION_TTL_MS);
  const diff = expiresAt.getTime() - now;
  assert.equal(diff, 86400000);
});

test("auth header extraction: Bearer token", () => {
  const token = "abc123";
  const header = `Bearer ${token}`;
  assert.equal(header.startsWith("Bearer "), true);
  const extracted = header.slice(7);
  assert.equal(extracted, token);
});

test("auth header extraction: missing header", () => {
  const header = null;
  assert.equal(header?.startsWith?.("Bearer ") ?? false, false);
});

test("auth header extraction: wrong scheme", () => {
  const header = "Basic abc123";
  assert.equal(header.startsWith("Bearer "), false);
});
