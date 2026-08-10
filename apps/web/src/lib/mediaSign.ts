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

export function randomMqttPassword(bytes = 18) {
  return randomBytes(bytes).toString("base64url");
}
