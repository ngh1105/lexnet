export interface GenLayerVerifyCaseInput {
  contractAddress: string;
  caseId: string;
}

export interface GenLayerReadCaseInput {
  contractAddress: string;
  caseId: string;
}

export interface GenLayerContractRequest {
  contractAddress: string;
  method: "verify_case";
  args: string[];
}

export interface GenLayerGetCaseRequest {
  contractAddress: string;
  method: "get_case";
  args: string[];
}

interface GenLayerWriteContractRequest {
  address: `0x${string}`;
  functionName: "verify_case";
  args: string[];
  value: bigint;
}

interface GenLayerReadContractRequest {
  address: `0x${string}`;
  functionName: "get_case";
  args: string[];
}

export interface GenLayerExecutionResult {
  transactionHash?: string;
  status?: string;
  raw: unknown;
}

export interface GenLayerCaseReadResult {
  caseId: string;
  raw: unknown;
  parsedCase: Record<string, unknown> | null;
}

export interface GenLayerSdkClient {
  writeContract?: (request: GenLayerWriteContractRequest) => Promise<unknown>;
  callContract?: (request: GenLayerWriteContractRequest) => Promise<unknown>;
  readContract?: (request: GenLayerReadContractRequest) => Promise<unknown>;
}

export interface GenLayerSdkModule {
  createClient?: (options: { endpoint: string }) => GenLayerSdkClient;
  createGenLayerClient?: (options: { endpoint: string }) => GenLayerSdkClient;
}

export interface GenLayerClientAdapterOptions {
  sdk: GenLayerSdkModule;
  rpcUrl: string;
}

export interface GenLayerClientAdapter {
  verifyCase(input: GenLayerVerifyCaseInput): Promise<GenLayerExecutionResult>;
  readCase(input: GenLayerReadCaseInput): Promise<GenLayerCaseReadResult>;
}

export function buildGenLayerVerifyCaseRequest({
  contractAddress,
  method,
  payload,
}: {
  contractAddress: string;
  method: "verify_case";
  payload: { case_id: string };
}): GenLayerContractRequest {
  return {
    contractAddress,
    method,
    args: [payload.case_id],
  };
}

export function buildGenLayerGetCaseRequest({
  contractAddress,
  caseId,
}: GenLayerReadCaseInput): GenLayerGetCaseRequest {
  return {
    contractAddress,
    method: "get_case",
    args: [caseId],
  };
}

export function parseGenLayerCase(raw: unknown): Record<string, unknown> | null {
  if (raw === "") {
    return null;
  }

  if (typeof raw === "string") {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  }

  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : null;
}

export function classifyGenLayerCaseProof(parsedCase: Record<string, unknown> | null): {
  status: "confirmed" | "state_verified";
  contractCaseStatus?: string;
  verificationReport?: unknown;
} {
  const verificationReport = parsedCase?.verification_report;
  return {
    status: verificationReport ? "state_verified" : "confirmed",
    contractCaseStatus:
      typeof parsedCase?.status === "string" ? parsedCase.status : undefined,
    verificationReport,
  };
}

export function createGenLayerClientAdapter({
  sdk,
  rpcUrl,
}: GenLayerClientAdapterOptions): GenLayerClientAdapter {
  const createClient = sdk.createClient ?? sdk.createGenLayerClient;
  if (!createClient) {
    throw new Error("genlayer-js client factory is unavailable.");
  }

  const client = createClient({ endpoint: rpcUrl });

  return {
    async verifyCase(input) {
      const request = buildGenLayerVerifyCaseRequest({
        contractAddress: input.contractAddress,
        method: "verify_case",
        payload: { case_id: input.caseId },
      });
      const execute = client.writeContract ?? client.callContract;
      if (!execute) {
        throw new Error("genlayer-js contract execution method is unavailable.");
      }

      return normalizeExecutionResult(
        await execute({
          address: request.contractAddress as `0x${string}`,
          functionName: request.method,
          args: request.args,
          value: 0n,
        }),
      );
    },
    async readCase(input) {
      if (!client.readContract) {
        throw new Error("genlayer-js contract read method is unavailable.");
      }

      const request = buildGenLayerGetCaseRequest(input);
      const raw = await client.readContract({
        address: request.contractAddress as `0x${string}`,
        functionName: request.method,
        args: request.args,
      });

      return {
        caseId: input.caseId,
        raw,
        parsedCase: parseGenLayerCase(raw),
      };
    },
  };
}

export async function loadGenLayerSdk(): Promise<GenLayerSdkModule> {
  return (await import("genlayer-js")) as unknown as GenLayerSdkModule;
}

function normalizeExecutionResult(raw: unknown): GenLayerExecutionResult {
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    return {
      transactionHash:
        typeof record.transactionHash === "string"
          ? record.transactionHash
          : typeof record.hash === "string"
            ? record.hash
            : undefined,
      status: typeof record.status === "string" ? record.status : undefined,
      raw,
    };
  }

  return { raw };
}
