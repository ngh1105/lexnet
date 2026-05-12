import { NextResponse } from "next/server";

export interface SecurityStatus {
  genLayerRpcUrlConfigured: boolean;
  contractAddressConfigured: boolean;
  walletConnectProjectIdConfigured: boolean;
  storeMode: "filesystem";
  blockingReasons: string[];
}

interface RateLimitState {
  count: number;
}

const rateLimits = new Map<string, RateLimitState>();

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(data, init);
}

export function jsonError(message: string, status = 400): NextResponse<{ error: string }> {
  return NextResponse.json({ error: message }, { status });
}

export async function readJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export function checkRateLimit(
  key: string,
  limit = 20,
): { allowed: boolean; remaining: number } {
  const current = rateLimits.get(key)?.count ?? 0;

  if (current >= limit) {
    return { allowed: false, remaining: 0 };
  }

  const next = current + 1;
  rateLimits.set(key, { count: next });

  return { allowed: true, remaining: Math.max(limit - next, 0) };
}

export function resetRateLimitForTests(): void {
  rateLimits.clear();
}

export function buildSecurityStatus(env: NodeJS.ProcessEnv): SecurityStatus {
  const genLayerRpcUrlConfigured = Boolean(env.NEXT_PUBLIC_GENLAYER_RPC_URL);
  const contractAddressConfigured = Boolean(env.NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS);
  const walletConnectProjectIdConfigured = Boolean(
    env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  );
  const blockingReasons: string[] = [];

  if (!genLayerRpcUrlConfigured) {
    blockingReasons.push("GenLayer RPC URL is not configured.");
  }
  if (!contractAddressConfigured) {
    blockingReasons.push("Contract address is not configured.");
  }
  if (!walletConnectProjectIdConfigured) {
    blockingReasons.push("WalletConnect project ID is not configured.");
  }

  return {
    genLayerRpcUrlConfigured,
    contractAddressConfigured,
    walletConnectProjectIdConfigured,
    storeMode: "filesystem",
    blockingReasons,
  };
}
