import { createHash, createHmac, randomBytes } from "crypto";

export function sha256Hex(buf: Buffer) {
  return createHash("sha256").update(buf).digest("hex");
}

export function mediaSigningSecret() {
  return process.env.MEDIA_SIGNING_SECRET || process.env.JWT_SECRET || "mpcis-media-sign-demo";
}

/** HMAC chữ ký media (demo/staging). Production: HSM / KMS. */
export function signMediaChecksum(checksum: string, storageKey: string) {
  return createHmac("sha256", mediaSigningSecret())
    .update(`${storageKey}:${checksum}`)
    .digest("hex");
}

/** Kiểm tra chữ ký media (device/sim từ chối file sai chữ ký). */
export function verifyMediaSignature(
  checksum: string,
  storageKey: string,
  signature: string | null | undefined,
): boolean {
  if (!signature || !checksum || !storageKey) return false;
  const expected = signMediaChecksum(checksum, storageKey);
  if (expected.length !== signature.length) return false;
  // timing-safe compare
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

export function randomMqttPassword(bytes = 18) {
  return randomBytes(bytes).toString("base64url");
}
