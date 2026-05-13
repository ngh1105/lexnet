import { getLexNetRuntimeMode, type PlatformReadinessEnv } from "./readiness";

export interface EvidenceUrlPolicyResult {
  acceptedUrls: string[];
  rejectedUrls: Array<{ url: string; reason: string }>;
  blockingReasons: string[];
}

export function evaluateEvidenceUrlPolicy(
  urls: string[],
  env: PlatformReadinessEnv = {},
): EvidenceUrlPolicyResult {
  const mode = getLexNetRuntimeMode(env);
  const acceptedUrls: string[] = [];
  const rejectedUrls: Array<{ url: string; reason: string }> = [];
  const seen = new Set<string>();

  for (const rawUrl of urls) {
    const url = rawUrl.trim();
    if (!url || seen.has(url)) {
      continue;
    }
    seen.add(url);

    const rejectionReason = getEvidenceUrlRejectionReason(url, mode === "production");
    if (rejectionReason) {
      rejectedUrls.push({ url, reason: rejectionReason });
      continue;
    }

    acceptedUrls.push(url);
  }

  return {
    acceptedUrls,
    rejectedUrls,
    blockingReasons: rejectedUrls.map(({ url, reason }) => `${url}: ${reason}`),
  };
}

function getEvidenceUrlRejectionReason(url: string, requiresHttps: boolean): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "Evidence URL must be a valid HTTP or HTTPS URL.";
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "Evidence URL must use HTTP or HTTPS.";
  }

  if (requiresHttps && parsed.protocol !== "https:") {
    return "Production evidence URLs must use HTTPS.";
  }

  const hostReason = getPrivateOrInternalHostReason(parsed.hostname);
  if (hostReason) {
    return hostReason;
  }

  return null;
}

function getPrivateOrInternalHostReason(hostname: string): string | null {
  const host = hostname.replace(/^\[(.*)\]$/, "$1").toLowerCase();

  if (host === "localhost" || host.endsWith(".local")) {
    return "Evidence URL host must not be private or internal.";
  }

  const ipv4Reason = getPrivateIpv4Reason(host);
  if (ipv4Reason) {
    return ipv4Reason;
  }

  const ipv6Reason = getPrivateIpv6Reason(host);
  if (ipv6Reason) {
    return ipv6Reason;
  }

  return null;
}

function getPrivateIpv4Reason(host: string): string | null {
  const parts = host.split(".");
  if (parts.length !== 4) {
    return null;
  }

  const octets = parts.map((part) => {
    if (!/^\d+$/.test(part)) {
      return Number.NaN;
    }
    return Number(part);
  });

  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return null;
  }

  const [first, second] = octets as [number, number, number, number];
  const isBlocked =
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first === 169 && second === 254 ||
    first === 172 && second >= 16 && second <= 31 ||
    first === 192 && second === 168;

  return isBlocked ? "Evidence URL host must not be private or internal." : null;
}

function getPrivateIpv6Reason(host: string): string | null {
  const normalized = host.toLowerCase();
  if (!normalized.includes(":")) {
    return null;
  }

  if (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80")
  ) {
    return "Evidence URL host must not be private or internal.";
  }

  return null;
}
