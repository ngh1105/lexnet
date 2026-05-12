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
  windowStartedAt: number;
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
  windowMs = 60_000,
  now = Date.now(),
): { allowed: boolean; remaining: number } {
  const current = rateLimits.get(key);
  const active = current && now - current.windowStartedAt < windowMs
    ? current
    : { count: 0, windowStartedAt: now };

  if (active.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  const next = active.count + 1;
  rateLimits.set(key, { count: next, windowStartedAt: active.windowStartedAt });

  return { allowed: true, remaining: Math.max(limit - next, 0) };
}

export function resetRateLimitForTests(): void {
  rateLimits.clear();
}

interface SecurityStatusEnv {
  [key: string]: string | undefined;
  NEXT_PUBLIC_GENLAYER_RPC_URL?: string;
  NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS?: string;
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?: string;
}

export function buildSecurityStatus(env: SecurityStatusEnv): SecurityStatus {
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
