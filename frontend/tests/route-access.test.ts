import test, { describe } from "node:test";
import assert from "node:assert/strict";

import {
  evaluateRouteAccess,
  type RouteAccessEnv,
  type RouteAccessHeaders,
  type RouteAccessInput,
} from "../src/lib/platform/route-access";

function buildInput(overrides: Partial<RouteAccessInput> = {}): RouteAccessInput {
  return {
    env: {},
    headers: {},
    cookies: {},
    pathname: "/",
    knownOperatorIds: ["operator-demo"],
    ...overrides,
  };
}

describe("evaluateRouteAccess", () => {
  describe("public routes are always accessible", () => {
    const publicPaths = [
      "/passport/some-slug",
      "/api/passports/public/some-slug",
      "/api/security/status",
      "/login",
      "/api/auth/demo-login",
      "/_next/static/chunk.js",
      "/favicon.ico",
    ];

    for (const pathname of publicPaths) {
      test(`allows ${pathname} without auth`, () => {
        const result = evaluateRouteAccess(
          buildInput({
            env: { LEXNET_ENABLE_DEMO_PRIVATE_API: "true" },
            pathname,
          }),
        );
        assert.deepEqual(result, { action: "allow" });
      });
    }
  });

  describe("developer mode (gate open)", () => {
    const devEnv: RouteAccessEnv = {};

    test("allows / without auth", () => {
      const result = evaluateRouteAccess(buildInput({ env: devEnv, pathname: "/" }));
      assert.deepEqual(result, { action: "allow" });
    });

    test("allows /cases without auth", () => {
      const result = evaluateRouteAccess(buildInput({ env: devEnv, pathname: "/cases" }));
      assert.deepEqual(result, { action: "allow" });
    });

    test("allows /cases/abc without auth", () => {
      const result = evaluateRouteAccess(buildInput({ env: devEnv, pathname: "/cases/abc" }));
      assert.deepEqual(result, { action: "allow" });
    });

    test("allows /passports without auth", () => {
      const result = evaluateRouteAccess(buildInput({ env: devEnv, pathname: "/passports" }));
      assert.deepEqual(result, { action: "allow" });
    });

    test("allows /platform without auth", () => {
      const result = evaluateRouteAccess(buildInput({ env: devEnv, pathname: "/platform" }));
      assert.deepEqual(result, { action: "allow" });
    });

    test("allows private API without auth", () => {
      const result = evaluateRouteAccess(buildInput({ env: devEnv, pathname: "/api/operators" }));
      assert.deepEqual(result, { action: "allow" });
    });

    test("local-demo without ENABLE_DEMO_PRIVATE_API is developer mode", () => {
      const result = evaluateRouteAccess(
        buildInput({ env: { LEXNET_RUNTIME_MODE: "local-demo" }, pathname: "/" }),
      );
      assert.deepEqual(result, { action: "allow" });
    });
  });

  describe("demo mode", () => {
    const demoEnv: RouteAccessEnv = { LEXNET_ENABLE_DEMO_PRIVATE_API: "true" };

    test("allows with valid operator header", () => {
      const result = evaluateRouteAccess(
        buildInput({
          env: demoEnv,
          headers: { "x-lexnet-operator-id": "operator-demo" },
          pathname: "/",
        }),
      );
      assert.deepEqual(result, { action: "allow" });
    });

    test("allows with valid operator cookie", () => {
      const result = evaluateRouteAccess(
        buildInput({
          env: demoEnv,
          cookies: { "lexnet-operator": "operator-demo" },
          pathname: "/cases",
        }),
      );
      assert.deepEqual(result, { action: "allow" });
    });

    test("redirects page to /login without auth", () => {
      const result = evaluateRouteAccess(
        buildInput({ env: demoEnv, pathname: "/" }),
      );
      assert.deepEqual(result, { action: "redirect", location: "/login" });
    });

    test("redirects /cases/abc to /login without auth", () => {
      const result = evaluateRouteAccess(
        buildInput({ env: demoEnv, pathname: "/cases/abc" }),
      );
      assert.deepEqual(result, { action: "redirect", location: "/login" });
    });

    test("returns 401 for API route without auth", () => {
      const result = evaluateRouteAccess(
        buildInput({ env: demoEnv, pathname: "/api/operators" }),
      );
      assert.deepEqual(result, { action: "deny", status: 401 });
    });

    test("rejects unknown operator header", () => {
      const result = evaluateRouteAccess(
        buildInput({
          env: demoEnv,
          headers: { "x-lexnet-operator-id": "unknown-operator" },
          pathname: "/",
        }),
      );
      assert.deepEqual(result, { action: "redirect", location: "/login" });
    });

    test("rejects unknown operator cookie", () => {
      const result = evaluateRouteAccess(
        buildInput({
          env: demoEnv,
          cookies: { "lexnet-operator": "unknown-operator" },
          pathname: "/api/queue",
        }),
      );
      assert.deepEqual(result, { action: "deny", status: 401 });
    });
  });

  describe("production mode", () => {
    const prodEnv: RouteAccessEnv = {
      LEXNET_RUNTIME_MODE: "production",
      LEXNET_PRODUCTION_AUTH_MODE: "trusted-header",
      LEXNET_PRODUCTION_AUTH_SECRET: "test-secret",
    };

    const validProdHeaders: RouteAccessHeaders = {
      "x-lexnet-production-auth-signature": "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      "x-lexnet-production-operator-id": "operator-demo",
      "x-lexnet-production-auth-timestamp": "1700000000",
      "x-lexnet-production-auth-nonce": "nonce-123",
    };

    test("allows with all production auth headers present", () => {
      const result = evaluateRouteAccess(
        buildInput({
          env: prodEnv,
          headers: validProdHeaders,
          pathname: "/",
        }),
      );
      assert.deepEqual(result, { action: "allow" });
    });

    test("denies without production auth headers", () => {
      const result = evaluateRouteAccess(
        buildInput({ env: prodEnv, pathname: "/" }),
      );
      assert.deepEqual(result, { action: "deny", status: 401 });
    });

    test("denies with partial production auth headers", () => {
      const result = evaluateRouteAccess(
        buildInput({
          env: prodEnv,
          headers: { "x-lexnet-production-auth-signature": "abc" },
          pathname: "/platform",
        }),
      );
      assert.deepEqual(result, { action: "deny", status: 401 });
    });

    test("pilot mode behaves like production", () => {
      const pilotEnv: RouteAccessEnv = { ...prodEnv, LEXNET_RUNTIME_MODE: "pilot" };
      const result = evaluateRouteAccess(
        buildInput({ env: pilotEnv, pathname: "/cases" }),
      );
      assert.deepEqual(result, { action: "deny", status: 401 });
    });

    test("public routes still accessible in production", () => {
      const result = evaluateRouteAccess(
        buildInput({ env: prodEnv, pathname: "/passport/my-slug" }),
      );
      assert.deepEqual(result, { action: "allow" });
    });

    test("denies malformed signature (not hex)", () => {
      const result = evaluateRouteAccess(
        buildInput({
          env: prodEnv,
          headers: {
            ...validProdHeaders,
            "x-lexnet-production-auth-signature": "zzzzzz1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
          },
          pathname: "/",
        }),
      );
      assert.deepEqual(result, { action: "deny", status: 401 });
    });

    test("denies malformed signature (wrong length)", () => {
      const result = evaluateRouteAccess(
        buildInput({
          env: prodEnv,
          headers: {
            ...validProdHeaders,
            "x-lexnet-production-auth-signature": "abcdef12",
          },
          pathname: "/",
        }),
      );
      assert.deepEqual(result, { action: "deny", status: 401 });
    });

    test("denies non-integer timestamp", () => {
      const result = evaluateRouteAccess(
        buildInput({
          env: prodEnv,
          headers: {
            ...validProdHeaders,
            "x-lexnet-production-auth-timestamp": "not-a-number",
          },
          pathname: "/",
        }),
      );
      assert.deepEqual(result, { action: "deny", status: 401 });
    });

    test("denies float timestamp", () => {
      const result = evaluateRouteAccess(
        buildInput({
          env: prodEnv,
          headers: {
            ...validProdHeaders,
            "x-lexnet-production-auth-timestamp": "1700000000.5",
          },
          pathname: "/",
        }),
      );
      assert.deepEqual(result, { action: "deny", status: 401 });
    });
  });
});
