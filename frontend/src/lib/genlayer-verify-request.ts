/**
 * Builds the fetch request options for the GenLayer verify-case API call.
 * Extracted for testability — the CaseDetailClient component uses this directly.
 */
export interface VerifyCaseRequestInput {
  caseId: string;
  walletConnected: boolean;
  connectedWalletAddress: string | undefined;
  demoToken?: string;
}

export interface VerifyCaseRequestInit {
  method: string;
  headers: Record<string, string>;
  body: string;
}

export function buildVerifyCaseRequest(input: VerifyCaseRequestInput): VerifyCaseRequestInit {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-lexnet-operator-id": "operator-demo",
  };

  if (input.demoToken) {
    headers["authorization"] = `Bearer ${input.demoToken}`;
  }

  return {
    method: "POST",
    headers,
    body: JSON.stringify({
      caseId: input.caseId,
      walletConnected: input.walletConnected,
      connectedWalletAddress: input.connectedWalletAddress,
    }),
  };
}
