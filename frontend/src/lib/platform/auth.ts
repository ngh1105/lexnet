import type { PlatformOperator, PlatformStore } from "./types";

export const DEMO_OPERATOR_ID = "operator-demo";

export function getDemoOperator(store: PlatformStore): PlatformOperator | undefined {
  return (
    store.operators.find((operator) => operator.id === DEMO_OPERATOR_ID) ??
    store.operators[0]
  );
}
