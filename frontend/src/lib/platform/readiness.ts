import { getLexNetContractReadiness } from "../lexnet-contract";

export type LexNetRuntimeMode = "local-demo" | "pilot" | "production";

export interface PlatformReadinessEnv {
  [key: string]: string | undefined;
  LEXNET_RUNTIME_MODE?: string;
  LEXNET_ENABLE_DEMO_PRIVATE_API?: string;
  LEXNET_DEMO_PRIVATE_API_TOKEN?: string;
  LEXNET_PRODUCTION_AUTH_PROVIDER?: string;
  LEXNET_MANAGED_DATABASE_URL?: string;
  LEXNET_MANAGED_PERSISTENCE_PROVIDER?: string;
  LEXNET_EVIDENCE_RETENTION_POLICY?: string;
  NEXT_PUBLIC_GENLAYER_RPC_URL?: string;
  NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS?: string;
  NEXT_PUBLIC_GENLAYER_NETWORK_LABEL?: string;
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?: string;
}

export interface AuthReadiness {
  mode: LexNetRuntimeMode;
  demoPrivateApiEnabled: boolean;
  demoPrivateApiTokenConfigured: boolean;
  productionAuthProvider?: string;
  productionAuthConfigured: boolean;
  mutatingRoutesAllowed: boolean;
  blockingReasons: string[];
}

export type PlatformPersistenceMode =
  | "filesystem-local"
  | "managed-configured"
  | "managed-missing";

export interface PersistenceReadiness {
  mode: PlatformPersistenceMode;
  filesystemPersistenceAllowed: boolean;
  managedPersistenceConfigured: boolean;
  managedPersistenceProviderConfigured: boolean;
  managedDatabaseUrlConfigured: boolean;
  blockingReasons: string[];
}

export interface EvidencePolicyStatus {
  allowPublicHttpsOnly: boolean;
  rawEvidenceStorage: "disabled";
  retentionPolicyConfigured: boolean;
  blockedPrivateNetworkHosts: boolean;
  blockingReasons: string[];
}

export interface GenLayerReadinessStatus {
  rpcUrlConfigured: boolean;
  contractAddressConfigured: boolean;
  walletConnectProjectIdConfigured: boolean;
  stateVerificationCapable: boolean;
  networkLabel: string;
  blockingReasons: string[];
}

export interface PlatformReadinessStatus {
  runtimeMode: LexNetRuntimeMode;
  auth: AuthReadiness;
  persistence: PersistenceReadiness;
  evidencePolicy: EvidencePolicyStatus;
  genLayer: GenLayerReadinessStatus;
  storeMode: "filesystem";
  persistenceMode: PlatformPersistenceMode;
  productionBlockers: string[];
  blockingReasons: string[];
}

export function getLexNetRuntimeMode(env: PlatformReadinessEnv): LexNetRuntimeMode {
  if (env.LEXNET_RUNTIME_MODE === "pilot" || env.LEXNET_RUNTIME_MODE === "production") {
    return env.LEXNET_RUNTIME_MODE;
  }

  return "local-demo";
}

export function buildAuthReadiness(env: PlatformReadinessEnv): AuthReadiness {
  const mode = getLexNetRuntimeMode(env);
  const demoPrivateApiEnabled = env.LEXNET_ENABLE_DEMO_PRIVATE_API === "true";
  const demoPrivateApiTokenConfigured = Boolean(env.LEXNET_DEMO_PRIVATE_API_TOKEN);
  const productionAuthProvider = env.LEXNET_PRODUCTION_AUTH_PROVIDER || undefined;
  const productionAuthConfigured = Boolean(productionAuthProvider);
  const blockingReasons: string[] = [];

  if (demoPrivateApiEnabled && !demoPrivateApiTokenConfigured) {
    blockingReasons.push("Demo-private API token is not configured.");
  }

  if (!productionAuthConfigured) {
    blockingReasons.push("Production authentication is not configured.");
  }

  if (mode === "production" && demoPrivateApiEnabled && !productionAuthConfigured) {
    blockingReasons.push("Production mode cannot rely on demo-private API authorization only.");
  }

  return {
    mode,
    demoPrivateApiEnabled,
    demoPrivateApiTokenConfigured,
    productionAuthProvider,
    productionAuthConfigured,
    mutatingRoutesAllowed: mode !== "production" || productionAuthConfigured,
    blockingReasons,
  };
}

export function buildPersistenceReadiness(env: PlatformReadinessEnv): PersistenceReadiness {
  const mode = getLexNetRuntimeMode(env);
  const managedDatabaseUrlConfigured = Boolean(env.LEXNET_MANAGED_DATABASE_URL);
  const managedPersistenceProviderConfigured = Boolean(env.LEXNET_MANAGED_PERSISTENCE_PROVIDER);
  const managedPersistenceConfigured = managedDatabaseUrlConfigured || managedPersistenceProviderConfigured;
  const blockingReasons: string[] = [];

  if (mode === "production" && !managedPersistenceConfigured) {
    blockingReasons.push("Managed persistence is not configured.");
  }

  if (mode === "pilot") {
    blockingReasons.push("Local filesystem persistence is pilot infrastructure, not production infrastructure.");
  }

  return {
    mode: mode === "production"
      ? managedPersistenceConfigured
        ? "managed-configured"
        : "managed-missing"
      : "filesystem-local",
    filesystemPersistenceAllowed: mode !== "production",
    managedPersistenceConfigured,
    managedPersistenceProviderConfigured,
    managedDatabaseUrlConfigured,
    blockingReasons,
  };
}

export function buildEvidencePolicyStatus(env: PlatformReadinessEnv): EvidencePolicyStatus {
  const mode = getLexNetRuntimeMode(env);
  const retentionPolicyConfigured = Boolean(env.LEXNET_EVIDENCE_RETENTION_POLICY);
  const blockingReasons: string[] = [];

  if (mode === "production" && !retentionPolicyConfigured) {
    blockingReasons.push("Evidence retention policy is not configured.");
  }

  return {
    allowPublicHttpsOnly: true,
    rawEvidenceStorage: "disabled",
    retentionPolicyConfigured,
    blockedPrivateNetworkHosts: true,
    blockingReasons,
  };
}

export function buildGenLayerReadinessStatus(env: PlatformReadinessEnv): GenLayerReadinessStatus {
  const readiness = getLexNetContractReadiness({ env, walletConnected: true });

  return {
    rpcUrlConfigured: Boolean(env.NEXT_PUBLIC_GENLAYER_RPC_URL),
    contractAddressConfigured: Boolean(env.NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS),
    walletConnectProjectIdConfigured: Boolean(env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID),
    stateVerificationCapable: readiness.isReady,
    networkLabel: readiness.networkLabel,
    blockingReasons: readiness.blockingReasons,
  };
}

function productionOnlyReasons(status: {
  auth: AuthReadiness;
  persistence: PersistenceReadiness;
  evidencePolicy: EvidencePolicyStatus;
}): string[] {
  return [
    ...status.auth.blockingReasons,
    ...status.persistence.blockingReasons,
    ...status.evidencePolicy.blockingReasons,
  ];
}

export function buildPlatformReadinessStatus(env: PlatformReadinessEnv): PlatformReadinessStatus {
  const runtimeMode = getLexNetRuntimeMode(env);
  const auth = buildAuthReadiness(env);
  const persistence = buildPersistenceReadiness(env);
  const evidencePolicy = buildEvidencePolicyStatus(env);
  const genLayer = buildGenLayerReadinessStatus(env);
  const productionBlockers = runtimeMode === "production"
    ? productionOnlyReasons({ auth, persistence, evidencePolicy })
    : [];

  return {
    runtimeMode,
    auth,
    persistence,
    evidencePolicy,
    genLayer,
    storeMode: "filesystem",
    persistenceMode: persistence.mode,
    productionBlockers,
    blockingReasons: [
      ...genLayer.blockingReasons,
      ...auth.blockingReasons,
      ...persistence.blockingReasons,
      ...evidencePolicy.blockingReasons,
    ],
  };
}
