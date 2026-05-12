import {
  buildPlatformReadinessStatus,
  type LexNetRuntimeMode,
  type PlatformReadinessEnv,
} from "./readiness";
import type { GenLayerExecutionStatus, PlatformStore } from "./types";

export interface PilotSummary {
  runtimeMode: LexNetRuntimeMode;
  caseCount: number;
  queueCount: number;
  publishedPassportCount: number;
  genLayerExecutionCounts: Record<string, number>;
  blockingReasons: string[];
}

const GENLAYER_STATUSES: GenLayerExecutionStatus[] = [
  "submitted",
  "confirmed",
  "failed",
  "state_verified",
];

export function buildPilotSummary(
  store: PlatformStore,
  env: PlatformReadinessEnv,
): PilotSummary {
  const readiness = buildPlatformReadinessStatus(env);
  const genLayerExecutionCounts: Record<string, number> = Object.fromEntries(
    GENLAYER_STATUSES.map((status) => [status, 0]),
  );

  for (const execution of store.genLayerExecutions) {
    genLayerExecutionCounts[execution.status] = (genLayerExecutionCounts[execution.status] ?? 0) + 1;
  }

  return {
    runtimeMode: readiness.runtimeMode,
    caseCount: store.cases.length,
    queueCount: store.queue.length,
    publishedPassportCount: store.publishedPassports.filter(
      (passport) => passport.status === "published",
    ).length,
    genLayerExecutionCounts,
    blockingReasons: readiness.blockingReasons,
  };
}
