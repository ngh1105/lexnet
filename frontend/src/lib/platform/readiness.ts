import { getLexNetContractReadiness } from "../lexnet-contract";
import { parseEvidenceRetentionPolicy } from "./evidence-policy";
import { getPlatformStoreAdapterStatus } from "./persistence-adapter";
import {
  getProductionAuthConfigurationStatus,
  type ProductionAuthMode,
} from "./production-auth";

export type LexNetRuntimeMode = "local-demo" | "pilot" | "production";

export interface PlatformReadinessEnv {
  [key: string]: string | undefined;
  LEXNET_RUNTIME_MODE?: string;
  LEXNET_ENABLE_DEMO_PRIVATE_API?: string;
  LEXNET_DEMO_PRIVATE_API_TOKEN?: string;
  LEXNET_PRODUCTION_AUTH_PROVIDER?: string;
  LEXNET_PRODUCTION_AUTH_MODE?: string;
  LEXNET_PRODUCTION_AUTH_SECRET?: string;
  LEXNET_PRODUCTION_AUTH_CLOCK_SKEW_SECONDS?: string;
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
  productionAuthConfigured: boolean;
  productionAuthEnforced: boolean;
  productionAuthMode?: ProductionAuthMode;
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
  managedPersistenceEnforced: boolean;
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
  storeMode: "filesystem" | "managed";
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
  const authStatus = getProductionAuthConfigurationStatus(env);
  const productionAuthConfigured = authStatus.providerConfigured || authStatus.modeConfigured || authStatus.secretConfigured;
  const productionAuthEnforced = authStatus.enforced;
  const blockingReasons = [...authStatus.blockingReasons];

  if (demoPrivateApiEnabled && !demoPrivateApiTokenConfigured) {
    blockingReasons.unshift("Demo-private API token is not configured.");
  }

  return {
    mode,
    demoPrivateApiEnabled,
    demoPrivateApiTokenConfigured,
    productionAuthConfigured,
    productionAuthEnforced,
    productionAuthMode: productionAuthEnforced ? "trusted-header" : undefined,
    mutatingRoutesAllowed: mode !== "production" || productionAuthEnforced,
    blockingReasons,
  };
}

export function buildPersistenceReadiness(env: PlatformReadinessEnv): PersistenceReadiness {
  const mode = getLexNetRuntimeMode(env);
  const adapterStatus = getPlatformStoreAdapterStatus(env);
  const managedDatabaseUrlConfigured = Boolean(env.LEXNET_MANAGED_DATABASE_URL);
  const managedPersistenceProviderConfigured = Boolean(env.LEXNET_MANAGED_PERSISTENCE_PROVIDER);
  const managedPersistenceConfigured = managedDatabaseUrlConfigured || managedPersistenceProviderConfigured;

  return {
    mode: adapterStatus.mode === "managed-configured"
      ? "managed-configured"
      : mode === "production"
        ? "managed-missing"
        : "filesystem-local",
    filesystemPersistenceAllowed: adapterStatus.mode === "filesystem-local" && mode !== "production",
    managedPersistenceConfigured,
    managedPersistenceEnforced: adapterStatus.managedPersistenceEnforced,
    managedPersistenceProviderConfigured,
    managedDatabaseUrlConfigured,
    blockingReasons: adapterStatus.blockingReasons,
  };
}

export function buildEvidencePolicyStatus(env: PlatformReadinessEnv): EvidencePolicyStatus {
  const mode = getLexNetRuntimeMode(env);
  const retention = parseEvidenceRetentionPolicy(env.LEXNET_EVIDENCE_RETENTION_POLICY);
  const blockingReasons = mode === "production" ? retention.blockingReasons : [];

  return {
    allowPublicHttpsOnly: true,
    rawEvidenceStorage: "disabled",
    retentionPolicyConfigured: retention.configured && retention.mode === "metadata-only",
    blockedPrivateNetworkHosts: true,
    blockingReasons,
  };
}

export function buildGenLayerReadinessStatus(env: PlatformReadinessEnv): GenLayerReadinessStatus {
  const rpcUrlConfigured = Boolean(env.NEXT_PUBLIC_GENLAYER_RPC_URL);
  const contractAddressConfigured = Boolean(env.NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS);
  const walletConnectProjectIdConfigured = Boolean(env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID);
  const stateVerificationCapable = rpcUrlConfigured && contractAddressConfigured;
  const readiness = getLexNetContractReadiness({
    env: {
      ...env,
      NEXT_PUBLIC_GENLAYER_RPC_URL: rpcUrlConfigured ? env.NEXT_PUBLIC_GENLAYER_RPC_URL : "",
    },
    walletConnected: stateVerificationCapable,
  });

  return {
    rpcUrlConfigured,
    contractAddressConfigured,
    walletConnectProjectIdConfigured,
    stateVerificationCapable,
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
    storeMode: persistence.managedPersistenceEnforced ? "managed" : "filesystem",
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
