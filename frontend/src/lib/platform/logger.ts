export interface LogEntry {
  timestamp: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  error?: string;
  userAgent?: string;
}

const logs: LogEntry[] = [];
const MAX_LOGS = 1000;

export function logRequest(entry: LogEntry): void {
  logs.push(entry);
  if (logs.length > MAX_LOGS) logs.shift();

  const level = entry.status >= 500 ? "ERROR" : entry.status >= 400 ? "WARN" : "INFO";
  const msg = `[${entry.timestamp}] ${level} ${entry.method} ${entry.path} ${entry.status} ${entry.durationMs}ms${entry.error ? ` err=${entry.error}` : ""}`;
  if (level === "ERROR") console.error(msg);
  else if (level === "WARN") console.warn(msg);
  else console.log(msg);
}

export function getRecentLogs(count = 50): LogEntry[] {
  return logs.slice(-count);
}

export function withLogging(
  handler: (request: Request, ctx?: any) => Promise<Response>,
): (request: Request, ctx?: any) => Promise<Response> {
  return async (request: Request, ctx?: any) => {
    const start = Date.now();
    const url = new URL(request.url);
    try {
      const response = await handler(request, ctx);
      logRequest({
        timestamp: new Date().toISOString(),
        method: request.method,
        path: url.pathname,
        status: response.status,
        durationMs: Date.now() - start,
        userAgent: request.headers.get("user-agent") ?? undefined,
      });
      return response;
    } catch (err) {
      logRequest({
        timestamp: new Date().toISOString(),
        method: request.method,
        path: url.pathname,
        status: 500,
        durationMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  };
}
