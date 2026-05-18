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
    evidenceUrls?: string[];
    walletConnected?: boolean;
    connectedWalletAddress?: string;
  }>(request);
  if (!body || typeof body.caseId !== "string") {
    return jsonError("Case ID is required.");
  }
  if (!Array.isArray(body.evidenceUrls)) {
    return jsonError("evidenceUrls must be an array.");
  }

  const commerceCase = store.cases.find((candidate) => candidate.id === body.caseId);
  if (!commerceCase) {
    return jsonError("Case not found.", 404);
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
    const result = await adapter.submitEvidence({
      contractAddress,
      caseId: commerceCase.id,
      evidenceUrls: body.evidenceUrls,
    });
    const submittedAt = new Date().toISOString();
    const execution = await appendGenLayerExecution({
      id: `glex-${commerceCase.id}-submit-evidence-${submittedAt}`,
      caseId: commerceCase.id,
      method: "submit_evidence",
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
      id: `glex-${commerceCase.id}-submit-evidence-${submittedAt}`,
      caseId: commerceCase.id,
      method: "submit_evidence",
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
