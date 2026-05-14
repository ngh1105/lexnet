import type { LexNetRuntimeMode, PlatformReadinessEnv } from "./readiness";

function getAdapterRuntimeMode(env: PlatformReadinessEnv): LexNetRuntimeMode {
  if (env.LEXNET_RUNTIME_MODE === "pilot" || env.LEXNET_RUNTIME_MODE === "production") {
    return env.LEXNET_RUNTIME_MODE;
  }

  return "local-demo";
}

export type PlatformStoreAdapterMode = "filesystem-local" | "managed-configured" | "managed-missing";

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
  const runtimeMode = getAdapterRuntimeMode(env);
  const managedProvider = env.LEXNET_MANAGED_PERSISTENCE_PROVIDER;
  const managedDatabaseUrlConfigured = Boolean(env.LEXNET_MANAGED_DATABASE_URL);
  const managedPersistenceConfigured = Boolean(managedProvider || env.LEXNET_MANAGED_DATABASE_URL);
  const managedProviderSupported = managedProvider === "postgres";

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

  const blockingReasons: string[] = [];
  if (!managedProvider) {
    blockingReasons.push("Managed persistence provider is not configured.");
  } else if (!managedProviderSupported) {
    blockingReasons.push("Managed persistence provider must be postgres.");
  }

  if (!managedDatabaseUrlConfigured) {
    blockingReasons.push("Managed database URL is not configured.");
  }

  const managedPersistenceEnforced = managedProviderSupported && managedDatabaseUrlConfigured;

  return {
    mode: managedPersistenceEnforced ? "managed-configured" : "managed-missing",
    runtimeMode,
    canRead: managedPersistenceEnforced,
    canMutate: managedPersistenceEnforced,
    managedPersistenceConfigured,
    managedPersistenceEnforced,
    blockingReasons,
  };
}
