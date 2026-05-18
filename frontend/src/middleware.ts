import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { evaluateRouteAccess, type RouteAccessEnv, type RouteAccessHeaders } from "./lib/platform/route-access";
import { DEMO_OPERATOR_IDS } from "./lib/platform/constants";

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

export function middleware(request: NextRequest): NextResponse {
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
    case "allow":
      return NextResponse.next();

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
  }
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
