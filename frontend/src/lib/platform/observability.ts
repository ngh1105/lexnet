import { randomUUID } from "node:crypto";

import { buildPlatformReadinessStatus, getLexNetRuntimeMode, type PlatformReadinessEnv } from "./readiness";
import type { PlatformAuditEvent, PlatformStore } from "./types";

export interface ProductionAuthAuditEventInput {
  accepted: boolean;
  operatorId?: string;
  pathname: string;
  method: string;
  reason?: string;
  createdAt?: string;
}

export interface PlatformObservabilityStatus {
  runtimeMode: ReturnType<typeof getLexNetRuntimeMode>;
  readinessBlockingReasonCount: number;
  productionBlockerCount: number;
  auditEventCount: number;
  latestAuditEventType: PlatformAuditEvent["type"] | null;
  latestAuditEventAt: string | null;
  managedPersistenceEnforced: boolean;
  productionAuthEnforced: boolean;
  evidenceRetentionPolicyConfigured: boolean;
}

export function buildProductionAuthAuditEvent(input: ProductionAuthAuditEventInput): PlatformAuditEvent {
  const eventType = input.accepted ? "production.auth.accepted" : "production.auth.rejected";
  const detail = input.accepted
    ? `Production mutation authorized for ${input.method.toUpperCase()} ${input.pathname}.`
    : `Production mutation rejected for ${input.method.toUpperCase()} ${input.pathname}.`;

  return {
    id: randomUUID(),
    type: eventType,
    entityType: "workspace",
    entityId: "platform",
    actorId: input.operatorId ?? "production-auth",
    createdAt: input.createdAt ?? new Date().toISOString(),
    detail: input.reason ? `${detail} ${input.reason}` : detail,
  };
}

export function buildPlatformObservabilityStatus(
  store: PlatformStore,
  env: PlatformReadinessEnv,
): PlatformObservabilityStatus {
  const readiness = buildPlatformReadinessStatus(env);
  const latestAuditEvent = store.auditEvents.at(-1) ?? null;

  return {
    runtimeMode: getLexNetRuntimeMode(env),
    readinessBlockingReasonCount: readiness.blockingReasons.length,
    productionBlockerCount: readiness.productionBlockers.length,
    auditEventCount: store.auditEvents.length,
    latestAuditEventType: latestAuditEvent?.type ?? null,
    latestAuditEventAt: latestAuditEvent?.createdAt ?? null,
    managedPersistenceEnforced: readiness.persistence.managedPersistenceEnforced,
    productionAuthEnforced: readiness.auth.productionAuthEnforced,
    evidenceRetentionPolicyConfigured: readiness.evidencePolicy.retentionPolicyConfigured,
  };
}
