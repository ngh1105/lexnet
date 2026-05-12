import { NextResponse } from "next/server";
import {
  buildPlatformReadinessStatus,
  type PlatformReadinessEnv,
  type PlatformReadinessStatus,
} from "./readiness";

export type SecurityStatus = PlatformReadinessStatus & {
  genLayerRpcUrlConfigured: boolean;
  contractAddressConfigured: boolean;
  walletConnectProjectIdConfigured: boolean;
  demoPrivateApiEnabled: boolean;
  demoPrivateApiTokenConfigured: boolean;
  productionAuthConfigured: boolean;
};

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

export function buildSecurityStatus(env: PlatformReadinessEnv): SecurityStatus {
  const status = buildPlatformReadinessStatus(env);

  return {
    ...status,
    genLayerRpcUrlConfigured: status.genLayer.rpcUrlConfigured,
    contractAddressConfigured: status.genLayer.contractAddressConfigured,
    walletConnectProjectIdConfigured: status.genLayer.walletConnectProjectIdConfigured,
    demoPrivateApiEnabled: status.auth.demoPrivateApiEnabled,
    demoPrivateApiTokenConfigured: status.auth.demoPrivateApiTokenConfigured,
    productionAuthConfigured: status.auth.productionAuthConfigured,
  };
}
