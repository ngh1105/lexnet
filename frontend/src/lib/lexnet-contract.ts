import {
  createContractVerificationAdapter,
  createLocalVerificationAdapter,
  type ContractVerificationAdapterOptions,
  type VerificationAdapter,
} from "./lexnet-verification";
import type { CommerceCase, CreateCommerceCaseInput } from "./lexnet-types";

export interface LexNetContractEnvironment {
  contractAddress: string | null;
  rpcUrl: string;
  networkLabel: string;
}

export interface LexNetContractReadinessInput {
  env?: Record<string, string | undefined>;
  walletConnected?: boolean;
}

export interface LexNetContractReadiness {
  contractAddress: string | null;
  rpcUrl: string;
  networkLabel: string;
  walletConnected: boolean;
  hasContractAddress: boolean;
  hasRpcUrl: boolean;
  isReady: boolean;
  modeLabel: string;
  blockingReasons: string[];
}

export interface LexNetContractCallPreview {
  method: "create_case" | "submit_evidence" | "verify_case";
  contractAddress: string | null;
  rpcUrl: string;
  networkLabel: string;
  enabled: boolean;
  blockingReasons: string[];
  payload: Record<string, unknown>;
}

export interface LexNetVerificationAdapterOptions {
  env?: Record<string, string | undefined>;
  preferRemote?: boolean;
  reviewedAt?: string;
}

const DEFAULT_RPC_URL = "https://studio.genlayer.com/api";
const DEFAULT_NETWORK_LABEL = "Studionet";

export function readLexNetContractEnvironment(
  env: Record<string, string | undefined> = process.env
): LexNetContractEnvironment {
  const contractAddress = normalizeValue(
    env.NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS
  );
  const rpcUrl = normalizeValue(
    env.NEXT_PUBLIC_GENLAYER_RPC_URL,
    DEFAULT_RPC_URL
  );
  const networkLabel = normalizeValue(
    env.NEXT_PUBLIC_GENLAYER_NETWORK_LABEL,
    DEFAULT_NETWORK_LABEL
  );

  return {
    contractAddress,
    rpcUrl,
    networkLabel,
  };
}

export function isLexNetContractReady(
  env: Record<string, string | undefined> = process.env
): boolean {
  return readLexNetContractEnvironment(env).contractAddress !== null;
}

export function describeLexNetVerificationMode(
  env: Record<string, string | undefined> = process.env
): string {
  const contract = readLexNetContractEnvironment(env);
  if (contract.contractAddress) {
    return `${contract.networkLabel} contract at ${contract.contractAddress}`;
  }
  return "local fallback verification";
}

export function getLexNetContractReadiness(
  input: LexNetContractReadinessInput = {}
): LexNetContractReadiness {
  const contract = readLexNetContractEnvironment(input.env);
  const walletConnected = input.walletConnected ?? false;
  const hasContractAddress = contract.contractAddress !== null;
  const hasRpcUrl = contract.rpcUrl.trim().length > 0;
  const blockingReasons: string[] = [];

  if (!hasContractAddress) {
    blockingReasons.push("Contract address is not configured.");
  }
  if (!hasRpcUrl) {
    blockingReasons.push("GenLayer RPC URL is not configured.");
  }
  if (!walletConnected) {
    blockingReasons.push("Wallet is not connected.");
  }

  return {
    ...contract,
    walletConnected,
    hasContractAddress,
    hasRpcUrl,
    isReady: blockingReasons.length === 0,
    modeLabel: hasContractAddress
      ? "Contract Configured / Local Verification"
      : "Local Verification",
    blockingReasons,
  };
}

export function buildCreateCaseCallPreview(
  input: CreateCommerceCaseInput,
  readiness: LexNetContractReadiness
): LexNetContractCallPreview {
  return buildCallPreview("create_case", readiness, {
    title: input.title.trim(),
    seller: input.seller.trim(),
    agreement_text: input.agreementText.trim(),
    acceptance_criteria_json: JSON.stringify(
      input.acceptanceCriteria.map((criterion) => criterion.trim()).filter(Boolean)
    ),
    amount_reference: Math.round(input.amountReference),
  });
}

export function buildSubmitEvidenceCallPreview(
  commerceCase: CommerceCase,
  urls: string[],
  readiness: LexNetContractReadiness
): LexNetContractCallPreview {
  return buildCallPreview("submit_evidence", readiness, {
    case_id: commerceCase.id,
    evidence_json: JSON.stringify(urls.map((url) => url.trim()).filter(Boolean)),
  });
}

export function buildVerifyCaseCallPreview(
  commerceCase: CommerceCase,
  readiness: LexNetContractReadiness
): LexNetContractCallPreview {
  return buildCallPreview("verify_case", readiness, {
    case_id: commerceCase.id,
  });
}

export function createLexNetVerificationAdapter(
  options: LexNetVerificationAdapterOptions = {}
): VerificationAdapter {
  const contract = readLexNetContractEnvironment(options.env);

  if (options.preferRemote !== false && contract.contractAddress) {
    const contractOptions: ContractVerificationAdapterOptions = {
      contractAddress: contract.contractAddress,
    };

    return createContractVerificationAdapter(contractOptions);
  }

  return createLocalVerificationAdapter(options.reviewedAt);
}

function buildCallPreview(
  method: LexNetContractCallPreview["method"],
  readiness: LexNetContractReadiness,
  payload: Record<string, unknown>
): LexNetContractCallPreview {
  return {
    method,
    contractAddress: readiness.contractAddress,
    rpcUrl: readiness.rpcUrl,
    networkLabel: readiness.networkLabel,
    enabled: readiness.isReady,
    blockingReasons: [...readiness.blockingReasons],
    payload,
  };
}

function normalizeValue(value: string | undefined): string | null;
function normalizeValue(value: string | undefined, fallback: string): string;
function normalizeValue(
  value: string | undefined,
  fallback?: string
): string | null {
  if (!value) {
    return fallback ?? null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback ?? null;
  }

  return trimmed;
}
