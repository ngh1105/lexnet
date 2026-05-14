import { NextResponse } from "next/server";

import {
  classifyGenLayerCaseProof,
  createGenLayerClientAdapter,
  loadGenLayerSdk,
} from "@/lib/genlayer-client";
import { getLexNetContractReadiness } from "@/lib/lexnet-contract";
import { jsonOk } from "@/lib/platform/api";
import { authorizeDemoPrivateApi } from "@/lib/platform/auth";
import {
  readPlatformStore,
  updateLatestGenLayerExecutionProof,
} from "@/lib/platform/store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const store = await readPlatformStore();
  const authorization = authorizeDemoPrivateApi(request, process.env, store);
  if (!authorization.authorized) {
    return authorization.response;
  }

  const { caseId } = await params;
  const readiness = getLexNetContractReadiness({
    env: process.env,
    walletConnected: request.headers.get("x-lexnet-wallet-connected") === "true",
    connectedWalletAddress: request.headers.get("x-lexnet-wallet-address") ?? undefined,
  });

  if (!readiness.isReady) {
    return NextResponse.json(
      {
        error: "GenLayer state read is not ready.",
        blockingReasons: readiness.blockingReasons,
      },
      { status: 409 },
    );
  }

  const checkedAt = new Date().toISOString();

  try {
    const sdk = await loadGenLayerSdk();
    const adapter = createGenLayerClientAdapter({ sdk, rpcUrl: readiness.rpcUrl });
    const result = await adapter.readCase({
      contractAddress: readiness.contractAddress ?? "",
      caseId,
    });
    const proof = classifyGenLayerCaseProof(result.parsedCase);
    const execution = await updateLatestGenLayerExecutionProof(caseId, {
      status: proof.status,
      checkedAt,
      proof: {
        contractCaseStatus: proof.contractCaseStatus,
        verificationReport: proof.verificationReport,
      },
    });

    return jsonOk({
      caseId,
      status: proof.status,
      stateVerified: proof.status === "state_verified",
      execution,
      result,
    });
  } catch (error) {
    const execution = await updateLatestGenLayerExecutionProof(caseId, {
      status: "failed",
      checkedAt,
      sanitizedError: error instanceof Error ? error.message : "GenLayer state read failed.",
    });

    return NextResponse.json(
      {
        error: "GenLayer state read failed.",
        execution,
      },
      { status: 502 },
    );
  }
}
