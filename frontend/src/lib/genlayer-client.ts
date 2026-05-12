export interface GenLayerVerifyCaseInput {
  contractAddress: string;
  caseId: string;
}

export interface GenLayerContractRequest {
  contractAddress: string;
  method: "verify_case";
  args: string[];
}

interface GenLayerWriteContractRequest {
  address: `0x${string}`;
  functionName: "verify_case";
  args: string[];
  value: bigint;
}

export interface GenLayerExecutionResult {
  transactionHash?: string;
  status?: string;
  raw: unknown;
}

export interface GenLayerSdkClient {
  writeContract?: (request: GenLayerWriteContractRequest) => Promise<unknown>;
  callContract?: (request: GenLayerWriteContractRequest) => Promise<unknown>;
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
