import { jsonError } from "./api";
import type { PlatformOperator, PlatformStore } from "./types";

export const DEMO_OPERATOR_ID = "operator-demo";

type DemoPrivateApiEnv = Pick<NodeJS.ProcessEnv, "LEXNET_ENABLE_DEMO_PRIVATE_API">;

export type DemoPrivateApiAuthorization =
  | { authorized: true; operator: PlatformOperator }
  | { authorized: false; response: Response };

export function getDemoOperator(store: PlatformStore): PlatformOperator | undefined {
  return store.operators.find((operator) => operator.id === DEMO_OPERATOR_ID);
}

export function isDemoOperatorRequest(request: Request): boolean {
  return request.headers.get("x-lexnet-operator-id") === DEMO_OPERATOR_ID;
}

export function authorizeDemoPrivateApi(
  request: Request,
  env: DemoPrivateApiEnv,
  store: PlatformStore,
): DemoPrivateApiAuthorization {
  if (env.LEXNET_ENABLE_DEMO_PRIVATE_API !== "true") {
    return { authorized: false, response: jsonError("Not found.", 404) };
  }

  if (!isDemoOperatorRequest(request)) {
    return { authorized: false, response: jsonError("Unauthorized.", 401) };
  }

  const operator = getDemoOperator(store);
  if (!operator) {
    return { authorized: false, response: jsonError("Unauthorized.", 401) };
  }

  return { authorized: true, operator };
}

export function requireDemoOperator(
  request: Request,
  store: PlatformStore,
): PlatformOperator | null {
  const authorization = authorizeDemoPrivateApi(request, process.env, store);
  return authorization.authorized ? authorization.operator : null;
}
