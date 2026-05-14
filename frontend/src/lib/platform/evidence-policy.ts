import { getLexNetRuntimeMode, type PlatformReadinessEnv } from "./readiness";

export type EvidenceRetentionMode = "metadata-only" | "invalid";

export interface EvidenceRetentionPolicyStatus {
  configured: boolean;
  mode: EvidenceRetentionMode;
  retentionDays: number | null;
  blockingReasons: string[];
}

export interface EvidenceUrlPolicyResult {
  acceptedUrls: string[];
  rejectedUrls: Array<{ url: string; reason: string }>;
  retention: EvidenceRetentionPolicyStatus;
  blockingReasons: string[];
}

export function parseEvidenceRetentionPolicy(policy: string | undefined): EvidenceRetentionPolicyStatus {
  if (!policy) {
    return {
      configured: false,
      mode: "invalid",
      retentionDays: null,
      blockingReasons: ["Evidence retention policy is not configured."],
    };
  }

  const match = /^metadata-(\d+)d$/.exec(policy);
  if (!match) {
    return {
      configured: true,
      mode: "invalid",
      retentionDays: null,
      blockingReasons: ["Evidence retention policy must use metadata-{days}d."],
    };
  }

  const retentionDays = Number(match[1]);
  if (!Number.isSafeInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650) {
    return {
      configured: true,
      mode: "invalid",
      retentionDays: null,
      blockingReasons: ["Evidence retention policy must retain metadata for 1 to 3650 days."],
    };
  }

  return {
    configured: true,
    mode: "metadata-only",
    retentionDays,
    blockingReasons: [],
  };
}

export function evaluateEvidenceUrlPolicy(
  urls: string[],
  env: PlatformReadinessEnv = {},
): EvidenceUrlPolicyResult {
  const mode = getLexNetRuntimeMode(env);
  const retention = parseEvidenceRetentionPolicy(env.LEXNET_EVIDENCE_RETENTION_POLICY);
  const retentionBlockingReasons = mode === "production" ? retention.blockingReasons : [];
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
    acceptedUrls: mode === "production" && retentionBlockingReasons.length > 0 ? [] : acceptedUrls,
    rejectedUrls,
    retention,
    blockingReasons: [
      ...rejectedUrls.map(({ url, reason }) => `${url}: ${reason}`),
      ...retentionBlockingReasons,
    ],
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

function getMappedIpv4Address(normalizedIpv6: string): string | null {
  const dotted = normalizedIpv6.match(/(?:^|:)ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (dotted) {
    return dotted;
  }

  const hextet = normalizedIpv6.match(/(?:^|:)ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/i);
  if (!hextet) {
    return null;
  }

  const high = Number.parseInt(hextet[1] ?? "", 16);
  const low = Number.parseInt(hextet[2] ?? "", 16);
  if (!Number.isInteger(high) || !Number.isInteger(low)) {
    return null;
  }

  return [high >> 8, high & 0xff, low >> 8, low & 0xff].join(".");
}

function getPrivateIpv6Reason(host: string): string | null {
  const normalized = host.toLowerCase();
  if (!normalized.includes(":")) {
    return null;
  }

  const mappedIpv4 = getMappedIpv4Address(normalized);
  if (mappedIpv4 && getPrivateIpv4Reason(mappedIpv4)) {
    return "Evidence URL host must not be private or internal.";
  }

  const firstHextet = Number.parseInt(normalized.split(":", 1)[0] ?? "", 16);
  const isUniqueLocal = Number.isInteger(firstHextet) && (firstHextet & 0xfe00) === 0xfc00;
  const isLinkLocal = Number.isInteger(firstHextet) && (firstHextet & 0xffc0) === 0xfe80;

  if (normalized === "::" || normalized === "::1" || isUniqueLocal || isLinkLocal) {
    return "Evidence URL host must not be private or internal.";
  }

  return null;
}
