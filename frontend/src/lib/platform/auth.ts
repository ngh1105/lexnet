import { jsonError } from "./api";
import { buildAuthReadiness, getLexNetRuntimeMode } from "./readiness";
import {
  resolveProductionAuthContext,
  type ProductionAuthEnv,
} from "./production-auth";
import type { PlatformOperator, PlatformStore } from "./types";

export const DEMO_OPERATOR_ID = "operator-demo";

type DemoPrivateApiEnv = ProductionAuthEnv & {
  [key: string]: string | undefined;
  LEXNET_RUNTIME_MODE?: string;
  LEXNET_ENABLE_DEMO_PRIVATE_API?: string;
  LEXNET_DEMO_PRIVATE_API_TOKEN?: string;
  LEXNET_PRODUCTION_AUTH_PROVIDER?: string;
};

export type DemoPrivateApiAuthorization =
  | { authorized: true; operator: PlatformOperator }
  | { authorized: false; response: Response };

export type PlatformMutationAuthorization =
  | { authorized: true; operator: PlatformOperator; authType: "demo-private" | "production" }
  | { authorized: false; response: Response };

export function getDemoOperator(store: PlatformStore): PlatformOperator | undefined {
  return store.operators.find((operator) => operator.id === DEMO_OPERATOR_ID);
}

export function isDemoOperatorRequest(request: Request): boolean {
  return request.headers.get("x-lexnet-operator-id") === DEMO_OPERATOR_ID;
}

function hasValidDemoToken(request: Request, expectedToken: string | undefined): boolean {
  if (!expectedToken) {
    return true;
  }

  const authorization = request.headers.get("authorization") ?? "";
  return authorization === `Bearer ${expectedToken}`;
}

export function authorizeDemoPrivateApi(
  request: Request,
  env: DemoPrivateApiEnv,
  store: PlatformStore,
): DemoPrivateApiAuthorization {
  if (env.LEXNET_ENABLE_DEMO_PRIVATE_API !== "true") {
    return { authorized: false, response: jsonError("Not found.", 404) };
  }

  const readiness = buildAuthReadiness(env);
  if (!readiness.mutatingRoutesAllowed && request.method !== "GET" && request.method !== "HEAD") {
    return {
      authorized: false,
      response: jsonError("Production authentication is not configured.", 403),
    };
  }

  if (!isDemoOperatorRequest(request)) {
    return { authorized: false, response: jsonError("Unauthorized.", 401) };
  }

  if (!hasValidDemoToken(request, env.LEXNET_DEMO_PRIVATE_API_TOKEN)) {
    return { authorized: false, response: jsonError("Unauthorized.", 401) };
  }

  const operator = getDemoOperator(store);
  if (!operator) {
    return { authorized: false, response: jsonError("Unauthorized.", 401) };
  }

  return { authorized: true, operator };
}

export function authorizePlatformMutation(
  request: Request,
  env: DemoPrivateApiEnv,
  store: PlatformStore,
  nowSeconds?: number,
): PlatformMutationAuthorization {
  if (getLexNetRuntimeMode(env) !== "production") {
    const authorization = authorizeDemoPrivateApi(request, env, store);
    return authorization.authorized
      ? { authorized: true, operator: authorization.operator, authType: "demo-private" }
      : authorization;
  }

  const context = resolveProductionAuthContext(request, env, nowSeconds);
  if (!context.authorized) {
    return { authorized: false, response: jsonError(context.reason, context.status) };
  }

  const operator = store.operators.find((candidate) => candidate.id === context.operatorId);
  if (!operator) {
    return { authorized: false, response: jsonError("Unauthorized.", 401) };
  }

  return { authorized: true, operator, authType: "production" };
}

export function requireDemoOperator(
  request: Request,
  store: PlatformStore,
): PlatformOperator | null {
  const authorization = authorizeDemoPrivateApi(request, process.env, store);
  return authorization.authorized ? authorization.operator : null;
}
