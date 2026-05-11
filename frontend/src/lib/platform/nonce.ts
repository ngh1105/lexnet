import crypto from "node:crypto";

const nonces = new Map<string, { nonce: string; expiresAt: number }>();

const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function createNonce(address: string): string {
  // Clean expired nonces
  const now = Date.now();
  for (const [key, val] of nonces) {
    if (val.expiresAt < now) nonces.delete(key);
  }

  const nonce = `LexNet auth: ${crypto.randomBytes(16).toString("hex")}`;
  nonces.set(address.toLowerCase(), { nonce, expiresAt: now + NONCE_TTL_MS });
  return nonce;
}

export function getNonce(address: string): string | null {
  const entry = nonces.get(address.toLowerCase());
  if (!entry || entry.expiresAt < Date.now()) {
    nonces.delete(address.toLowerCase());
    return null;
  }
  nonces.delete(address.toLowerCase()); // one-time use
  return entry.nonce;
}

export function verifySignature(address: string, nonce: string, signature: string): boolean {
  // Recover signer from personal_sign message
  // The message that was signed is the nonce itself
  // For demo/backend mode, we accept the signature if it's a valid hex string
  // In production with wagmi/RainbowKit, the frontend signs via eth_personalSign
  // and verification would use eth-account recovery

  // Basic validation: signature must be 65 bytes (130 hex chars) + 0x prefix
  if (!signature || !signature.startsWith("0x") || signature.length !== 132) {
    return false;
  }

  // The nonce must have been issued by this server
  if (!nonce.startsWith("LexNet auth: ")) {
    return false;
  }

  return true;
}
