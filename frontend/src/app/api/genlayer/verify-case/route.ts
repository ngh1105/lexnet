import { NextResponse } from "next/server";

import { jsonError, jsonOk, readJsonBody } from "@/lib/platform/api";
import { authorizeDemoPrivateApi } from "@/lib/platform/auth";
import { readPlatformStore } from "@/lib/platform/store";
import { createGenLayerClientAdapter, loadGenLayerSdk } from "@/lib/genlayer-client";
import {
  buildVerifyCaseExecutionPlan,
  getLexNetContractReadiness,
} from "@/lib/lexnet-contract";

export async function POST(request: Request) {
  const store = await readPlatformStore();
  const authorization = authorizeDemoPrivateApi(request, process.env, store);
  if (!authorization.authorized) {
    return authorization.response;
  }

  const body = await readJsonBody<{ caseId?: string; walletConnected?: boolean }>(request);
  if (!body || typeof body.caseId !== "string") {
    return jsonError("Case ID is required.");
  }

  const commerceCase = store.cases.find((candidate) => candidate.id === body.caseId);
  if (!commerceCase) {
    return jsonError("Case not found.", 404);
  }

  const readiness = getLexNetContractReadiness({
    env: process.env,
    walletConnected: body.walletConnected === true,
  });
  const plan = buildVerifyCaseExecutionPlan(commerceCase, readiness);
  if (!plan.enabled) {
    return NextResponse.json(
      {
        error: "GenLayer execution is not ready.",
        blockingReasons: plan.blockingReasons,
      },
      { status: 409 },
    );
  }

  const sdk = await loadGenLayerSdk();
  const adapter = createGenLayerClientAdapter({ sdk, rpcUrl: readiness.rpcUrl });
  const result = await adapter.verifyCase({
    contractAddress: plan.request.contractAddress,
    caseId: commerceCase.id,
  });

  return jsonOk({ status: "submitted", result });
}
