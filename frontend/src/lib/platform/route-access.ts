/**
 * Route access evaluation — pure function with no Next.js or fetch dependencies.
 *
 * Authentication modes:
 * 1. Developer mode (LEXNET_RUNTIME_MODE unset/local-demo AND LEXNET_ENABLE_DEMO_PRIVATE_API !== "true"):
 *    Gate is open. All routes are accessible without authentication.
 *    This is the default for local development without explicit demo-private config.
 *
 * 2. Demo mode (LEXNET_RUNTIME_MODE empty or "local-demo" AND LEXNET_ENABLE_DEMO_PRIVATE_API === "true"):
 *    Requires header x-lexnet-operator-id matching a known demo operator OR
 *    cookie lexnet-operator set to a known operator id.
 *    Pages redirect to /login; API routes return 401.
 *
 * 3. Production mode (LEXNET_RUNTIME_MODE === "production" or "pilot"):
 *    Requires trusted-header HMAC auth (x-lexnet-production-auth-signature).
 *    Missing/invalid returns 401.
 */

export interface RouteAccessEnv {
  LEXNET_RUNTIME_MODE?: string;
  LEXNET_ENABLE_DEMO_PRIVATE_API?: string;
  LEXNET_PRODUCTION_AUTH_MODE?: string;
  LEXNET_PRODUCTION_AUTH_SECRET?: string;
}

export interface RouteAccessHeaders {
  "x-lexnet-operator-id"?: string;
  "x-lexnet-production-auth-signature"?: string;
  "x-lexnet-production-operator-id"?: string;
  "x-lexnet-production-auth-timestamp"?: string;
  "x-lexnet-production-auth-nonce"?: string;
}

export interface RouteAccessInput {
  env: RouteAccessEnv;
  headers: RouteAccessHeaders;
  cookies: { "lexnet-operator"?: string };
  pathname: string;
  /** Known operator IDs from the platform store */
  knownOperatorIds: string[];
}

export type RouteAccessDecision =
  | { action: "allow" }
  | { action: "redirect"; location: string }
  | { action: "deny"; status: 401 | 403 };

/** Pathnames that are always public (no auth required). */
const PUBLIC_PATH_PATTERNS: Array<(pathname: string) => boolean> = [
  // Public passport view
  (p) => /^\/passport\/[^/]+$/.test(p),
  // Public passport API
  (p) => p.startsWith("/api/passports/public/"),
  // Security status API
  (p) => p === "/api/security/status",
  // Login page itself
  (p) => p === "/login",
  // Demo login API
  (p) => p === "/api/auth/demo-login",
  // Next.js internals
  (p) => p.startsWith("/_next/"),
  (p) => p.startsWith("/__next"),
  // Static assets
  (p) => p === "/favicon.ico",
];

/** Pathnames that require operator authentication. */
const PROTECTED_PATH_PATTERNS: Array<(pathname: string) => boolean> = [
  (p) => p === "/",
  (p) => p === "/cases" || p.startsWith("/cases/"),
  (p) => p === "/passports",
  (p) => p === "/platform",
  // Private API routes (not explicitly public)
  (p) => p.startsWith("/api/") && !isPublicPath(p),
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PATTERNS.some((matcher) => matcher(pathname));
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PATTERNS.some((matcher) => matcher(pathname));
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

function getRuntimeMode(env: RouteAccessEnv): "local-demo" | "production" | "pilot" {
  if (env.LEXNET_RUNTIME_MODE === "production") return "production";
  if (env.LEXNET_RUNTIME_MODE === "pilot") return "pilot";
  return "local-demo";
}

function isDeveloperMode(env: RouteAccessEnv): boolean {
  // Developer mode: local-demo without demo-private API enabled.
  // Gate is open — no authentication required for any route.
  const mode = getRuntimeMode(env);
  return mode === "local-demo" && env.LEXNET_ENABLE_DEMO_PRIVATE_API !== "true";
}

function isDemoMode(env: RouteAccessEnv): boolean {
  const mode = getRuntimeMode(env);
  return mode === "local-demo" && env.LEXNET_ENABLE_DEMO_PRIVATE_API === "true";
}

function isProductionMode(env: RouteAccessEnv): boolean {
  const mode = getRuntimeMode(env);
  return mode === "production" || mode === "pilot";
}

function evaluateDemoAuth(input: RouteAccessInput): RouteAccessDecision {
  const { headers, cookies, pathname, knownOperatorIds } = input;

  // Check header-based auth
  const headerOperatorId = headers["x-lexnet-operator-id"];
  if (headerOperatorId && knownOperatorIds.includes(headerOperatorId)) {
    return { action: "allow" };
  }

  // Check cookie-based auth
  const cookieOperatorId = cookies["lexnet-operator"];
  if (cookieOperatorId && knownOperatorIds.includes(cookieOperatorId)) {
    return { action: "allow" };
  }

  // Not authenticated
  if (isApiRoute(pathname)) {
    return { action: "deny", status: 401 };
  }

  return { action: "redirect", location: "/login" };
}

function evaluateProductionAuth(input: RouteAccessInput): RouteAccessDecision {
  const { headers } = input;

  // In production mode, we check for the presence and basic format of production auth headers.
  // The actual HMAC verification is done by the middleware layer (requires crypto).
  const signature = headers["x-lexnet-production-auth-signature"] ?? "";
  const operatorId = headers["x-lexnet-production-operator-id"] ?? "";
  const timestamp = headers["x-lexnet-production-auth-timestamp"] ?? "";
  const nonce = headers["x-lexnet-production-auth-nonce"] ?? "";

  if (!signature || !operatorId || !timestamp || !nonce) {
    return { action: "deny", status: 401 };
  }
  if (!/^[a-f0-9]{64}$/i.test(signature)) {
    return { action: "deny", status: 401 };
  }
  if (!Number.isInteger(Number(timestamp))) {
    return { action: "deny", status: 401 };
  }
  return { action: "allow" };
}

export function evaluateRouteAccess(input: RouteAccessInput): RouteAccessDecision {
  const { env, pathname } = input;

  // Public routes are always accessible
  if (isPublicPath(pathname)) {
    return { action: "allow" };
  }

  // Non-protected routes pass through
  if (!isProtectedPath(pathname)) {
    return { action: "allow" };
  }

  // Developer mode: gate is open (no auth required)
  if (isDeveloperMode(env)) {
    return { action: "allow" };
  }

  // Demo mode: require operator header or cookie
  if (isDemoMode(env)) {
    return evaluateDemoAuth(input);
  }

  // Production/pilot mode: require trusted-header HMAC
  if (isProductionMode(env)) {
    return evaluateProductionAuth(input);
  }

  // Fallback: fail closed (should not reach here)
  return { action: "deny", status: 401 };
}
