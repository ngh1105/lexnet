type RateStore = Map<string, { count: number; resetAt: number }>;

const stores = new Map<string, RateStore>();

function getStore(prefix: string): RateStore {
  if (!stores.has(prefix)) stores.set(prefix, new Map());
  return stores.get(prefix)!;
}

export function rateLimit(
  key: string,
  opts: { maxRequests?: number; windowMs?: number } = {}
): { allowed: boolean; remaining: number; resetAt: number } {
  const maxRequests = opts.maxRequests ?? 30;
  const windowMs = opts.windowMs ?? 60_000;
  const store = getStore(key);
  const now = Date.now();

  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

export function rateLimitByIp(
  request: Request,
  opts: { maxRequests?: number; windowMs?: number; prefix?: string } = {}
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const prefix = opts.prefix ?? "ip";
  const result = rateLimit(`${prefix}:${ip}`, opts);
  return { ...result, retryAfterMs: result.resetAt - Date.now() };
}
