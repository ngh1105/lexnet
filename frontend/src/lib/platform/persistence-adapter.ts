import { getLexNetRuntimeMode, type LexNetRuntimeMode, type PlatformReadinessEnv } from "./readiness";

export type PlatformStoreAdapterMode = "filesystem-local" | "managed-required";

export interface PlatformStoreAdapterStatus {
  mode: PlatformStoreAdapterMode;
  runtimeMode: LexNetRuntimeMode;
  canRead: boolean;
  canMutate: boolean;
  managedPersistenceConfigured: boolean;
  managedPersistenceEnforced: boolean;
  blockingReasons: string[];
}

export function getPlatformStoreAdapterStatus(env: PlatformReadinessEnv): PlatformStoreAdapterStatus {
  const runtimeMode = getLexNetRuntimeMode(env);
  const managedPersistenceConfigured = Boolean(
    env.LEXNET_MANAGED_DATABASE_URL || env.LEXNET_MANAGED_PERSISTENCE_PROVIDER,
  );

  if (runtimeMode !== "production") {
    return {
      mode: "filesystem-local",
      runtimeMode,
      canRead: true,
      canMutate: true,
      managedPersistenceConfigured,
      managedPersistenceEnforced: false,
      blockingReasons: runtimeMode === "pilot"
        ? ["Local filesystem persistence is pilot infrastructure, not production infrastructure."]
        : [],
    };
  }

  return {
    mode: "managed-required",
    runtimeMode,
    canRead: false,
    canMutate: false,
    managedPersistenceConfigured,
    managedPersistenceEnforced: false,
    blockingReasons: [
      managedPersistenceConfigured
        ? "Managed persistence adapter is not implemented."
        : "Managed persistence is not configured.",
    ],
  };
}
