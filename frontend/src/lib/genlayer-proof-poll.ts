/**
 * Pure polling helper for GenLayer proof read-back.
 * Injectable fetcher for testability; abortable via AbortSignal.
 */
export interface PollGenLayerProofOptions {
  caseId: string;
  fetcher: typeof fetch;
  intervalMs: number;
  maxAttempts: number;
  signal?: AbortSignal;
}

export interface PollGenLayerProofResult {
  verified: boolean;
  verificationReport?: unknown;
  lastResponse?: unknown;
}

export async function pollGenLayerProof(
  opts: PollGenLayerProofOptions,
): Promise<PollGenLayerProofResult> {
  const { caseId, fetcher, intervalMs, maxAttempts, signal } = opts;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (signal?.aborted) {
      return { verified: false };
    }

    try {
      const response = await fetcher("/api/genlayer/cases/" + caseId, {
        headers: {
          "x-lexnet-operator-id": "operator-demo",
          "x-lexnet-wallet-connected": "true",
        },
        signal,
      });

      if (signal?.aborted) {
        return { verified: false };
      }

      if (response.ok) {
        const payload = await response.json();
        const report = payload?.result?.parsedCase?.verification_report;

        if (report) {
          return {
            verified: true,
            verificationReport: report,
            lastResponse: payload,
          };
        }
      }
    } catch {
      // Network error or abort — check signal
      if (signal?.aborted) {
        return { verified: false };
      }
    }

    // Sleep between attempts (skip sleep after last attempt)
    if (attempt < maxAttempts - 1) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, intervalMs);
        // If signal aborts during sleep, resolve immediately
        if (signal) {
          const onAbort = () => {
            clearTimeout(timer);
            resolve();
          };
          signal.addEventListener("abort", onAbort, { once: true });
        }
      });
    }
  }

  return { verified: false };
}
