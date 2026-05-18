import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { evaluateRouteAccess, type RouteAccessEnv, type RouteAccessHeaders } from "./lib/platform/route-access";
import { DEMO_OPERATOR_IDS } from "./lib/platform/constants";
import { verifyEdgeAuth, sha256Hex, EMPTY_BODY_SHA256_HEX } from "./lib/platform/production-auth-edge";

function getEnv(): RouteAccessEnv {
  return {
    LEXNET_RUNTIME_MODE: process.env.LEXNET_RUNTIME_MODE,
    LEXNET_ENABLE_DEMO_PRIVATE_API: process.env.LEXNET_ENABLE_DEMO_PRIVATE_API,
    LEXNET_PRODUCTION_AUTH_MODE: process.env.LEXNET_PRODUCTION_AUTH_MODE,
    LEXNET_PRODUCTION_AUTH_SECRET: process.env.LEXNET_PRODUCTION_AUTH_SECRET,
  };
}

function extractHeaders(request: NextRequest): RouteAccessHeaders {
  return {
    "x-lexnet-operator-id": request.headers.get("x-lexnet-operator-id") ?? undefined,
    "x-lexnet-production-auth-signature": request.headers.get("x-lexnet-production-auth-signature") ?? undefined,
    "x-lexnet-production-operator-id": request.headers.get("x-lexnet-production-operator-id") ?? undefined,
    "x-lexnet-production-auth-timestamp": request.headers.get("x-lexnet-production-auth-timestamp") ?? undefined,
    "x-lexnet-production-auth-nonce": request.headers.get("x-lexnet-production-auth-nonce") ?? undefined,
  };
}

function extractCookies(request: NextRequest): { "lexnet-operator"?: string } {
  const value = request.cookies.get("lexnet-operator")?.value;
  return value ? { "lexnet-operator": value } : {};
}

function isProductionMode(env: RouteAccessEnv): boolean {
  return env.LEXNET_RUNTIME_MODE === "production" || env.LEXNET_RUNTIME_MODE === "pilot";
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const env = getEnv();
  const headers = extractHeaders(request);
  const cookies = extractCookies(request);

  const decision = evaluateRouteAccess({
    env,
    headers,
    cookies,
    pathname,
    knownOperatorIds: DEMO_OPERATOR_IDS,
  });

  switch (decision.action) {
    case "redirect": {
      const url = request.nextUrl.clone();
      url.pathname = decision.location;
      return NextResponse.redirect(url);
    }

    case "deny":
      return new NextResponse(JSON.stringify({ error: "Unauthorized." }), {
        status: decision.status,
        headers: { "content-type": "application/json" },
      });

    case "allow":
      break;
  }

  // In production/pilot mode, perform full HMAC verification on protected routes.
  if (isProductionMode(env)) {
    const secret = process.env.LEXNET_PRODUCTION_AUTH_SECRET;
    if (!secret) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized." }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    const signature = headers["x-lexnet-production-auth-signature"];
    const operatorId = headers["x-lexnet-production-operator-id"];
    const timestamp = headers["x-lexnet-production-auth-timestamp"];
    const nonce = headers["x-lexnet-production-auth-nonce"];

    // Only verify if production auth headers are present (protected routes already
    // require them via evaluateProductionAuth in route-access.ts).
    if (signature && operatorId && timestamp && nonce) {
      const clockSkew = Number(process.env.LEXNET_PRODUCTION_AUTH_CLOCK_SKEW_SECONDS) || 60;

      // Compute body hash for non-GET/HEAD requests
      let bodySha256Hex = EMPTY_BODY_SHA256_HEX;
      const method = request.method.toUpperCase();
      if (method !== "GET" && method !== "HEAD") {
        const bodyText = await request.clone().text();
        if (bodyText.length > 0) {
          bodySha256Hex = await sha256Hex(bodyText);
        }
      }

      const queryString = request.nextUrl.search.startsWith("?")
        ? request.nextUrl.search.slice(1)
        : request.nextUrl.search;

      const result = await verifyEdgeAuth({
        method,
        pathname,
        queryString,
        operatorId,
        timestamp,
        nonce,
        bodySha256Hex,
        signature,
        secret,
        clockSkewSeconds: clockSkew,
      });

      if (!result.authorized) {
        return new NextResponse(JSON.stringify({ error: "Unauthorized.", reason: result.reason }), {
          status: result.status,
          headers: { "content-type": "application/json" },
        });
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
