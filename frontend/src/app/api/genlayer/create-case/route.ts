import { NextResponse } from "next/server";

import { jsonError, jsonOk, readJsonBody } from "@/lib/platform/api";
import { authorizePlatformMutation } from "@/lib/platform/auth";
import { appendGenLayerExecution, readPlatformStore } from "@/lib/platform/store";
import { createGenLayerClientAdapter, loadGenLayerSdk } from "@/lib/genlayer-client";
import { getLexNetContractReadiness } from "@/lib/lexnet-contract";

export async function POST(request: Request) {
  const store = await readPlatformStore();
  const authorization = await authorizePlatformMutation(request, process.env, store);
  if (!authorization.authorized) {
    return authorization.response;
  }

  const body = await readJsonBody<{
    caseId?: string;
    title?: string;
    seller?: string;
    agreementText?: string;
    acceptanceCriteria?: string[];
    amountReference?: number;
    walletConnected?: boolean;
    connectedWalletAddress?: string;
  }>(request);
  if (
    !body ||
    typeof body.caseId !== "string" ||
    typeof body.title !== "string" ||
    typeof body.seller !== "string" ||
    typeof body.agreementText !== "string" ||
    !Array.isArray(body.acceptanceCriteria) ||
    typeof body.amountReference !== "number"
  ) {
    return jsonError("Missing or invalid create_case fields.");
  }

  const readiness = getLexNetContractReadiness({
    env: process.env,
    walletConnected: body.walletConnected === true,
    connectedWalletAddress: body.connectedWalletAddress,
  });
  if (!readiness.isReady) {
    return NextResponse.json(
      {
        error: "GenLayer execution is not ready.",
        blockingReasons: readiness.blockingReasons,
      },
      { status: 409 },
    );
  }

  const contractAddress = readiness.contractAddress ?? "";

  try {
    const sdk = await loadGenLayerSdk();
    const adapter = createGenLayerClientAdapter({ sdk, rpcUrl: readiness.rpcUrl });
    const result = await adapter.createCase({
      contractAddress,
      caseId: body.caseId,
      title: body.title,
      seller: body.seller,
      agreementText: body.agreementText,
      acceptanceCriteria: body.acceptanceCriteria,
      amountReference: body.amountReference,
    });
    const submittedAt = new Date().toISOString();
    const execution = await appendGenLayerExecution({
      id: `glex-${body.caseId}-create-case-${submittedAt}`,
      caseId: body.caseId,
      method: "create_case",
      status: "submitted",
      transactionHash: result.transactionHash,
      contractAddress,
      rpcUrl: readiness.rpcUrl,
      networkLabel: readiness.networkLabel,
      submittedAt,
      blockingReasons: [],
    });

    return jsonOk({ status: "submitted", execution, result });
  } catch (error) {
    const submittedAt = new Date().toISOString();
    const execution = await appendGenLayerExecution({
      id: `glex-${body.caseId}-create-case-${submittedAt}`,
      caseId: body.caseId,
      method: "create_case",
      status: "failed",
      contractAddress,
      rpcUrl: readiness.rpcUrl,
      networkLabel: readiness.networkLabel,
      submittedAt,
      blockingReasons: [],
      sanitizedError: error instanceof Error ? error.message : "GenLayer execution failed.",
    });

    return NextResponse.json(
      { error: "GenLayer execution failed.", execution },
      { status: 502 },
    );
  }
}
