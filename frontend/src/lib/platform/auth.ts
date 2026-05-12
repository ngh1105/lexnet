import type { PlatformOperator, PlatformStore } from "./types";

export const DEMO_OPERATOR_ID = "operator-demo";

export function getDemoOperator(store: PlatformStore): PlatformOperator | undefined {
  return (
    store.operators.find((operator) => operator.id === DEMO_OPERATOR_ID) ??
    store.operators[0]
  );
}

export function isDemoOperatorRequest(request: Request): boolean {
  return request.headers.get("x-lexnet-operator-id") === DEMO_OPERATOR_ID;
}

export function requireDemoOperator(
  request: Request,
  store: PlatformStore,
): PlatformOperator | null {
  if (!isDemoOperatorRequest(request)) {
    return null;
  }

  return getDemoOperator(store) ?? null;
}
