import type { GenLayerExecutionRecord } from "./platform/types";

export interface GenLayerExecutionViewModel {
  label: string;
  description: string;
  tone: "neutral" | "ready" | "pending" | "success" | "danger";
  canSubmit: boolean;
  canCheckState: boolean;
}

export function buildGenLayerExecutionViewModel(
  execution: Pick<GenLayerExecutionRecord, "status" | "sanitizedError"> | null,
  isReady: boolean,
): GenLayerExecutionViewModel {
  if (!isReady) {
    return {
      label: "Local recommendation only",
      description: "GenLayer execution is blocked until contract, RPC, and wallet readiness pass.",
      tone: "neutral",
      canSubmit: false,
      canCheckState: false,
    };
  }

  if (!execution) {
    return {
      label: "GenLayer ready",
      description: "This case can be submitted for GenLayer verification.",
      tone: "ready",
      canSubmit: true,
      canCheckState: false,
    };
  }

  if (execution.status === "submitted") {
    return {
      label: "Submitted to GenLayer",
      description: "Submission returned from the SDK. Contract state proof is still pending.",
      tone: "pending",
      canSubmit: false,
      canCheckState: true,
    };
  }

  if (execution.status === "confirmed") {
    return {
      label: "Waiting for contract state verification",
      description: "Contract state was readable, but no verification report was found yet.",
      tone: "pending",
      canSubmit: false,
      canCheckState: true,
    };
  }

  if (execution.status === "state_verified") {
    return {
      label: "Verified from contract state",
      description: "Contract state contains a verification report for this case.",
      tone: "success",
      canSubmit: false,
      canCheckState: true,
    };
  }

  return {
    label: "Execution failed",
    description: execution.sanitizedError ?? "The GenLayer execution attempt failed.",
    tone: "danger",
    canSubmit: true,
    canCheckState: true,
  };
}
