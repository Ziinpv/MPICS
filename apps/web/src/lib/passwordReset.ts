import { createHash, randomBytes } from "crypto";

export function generateResetToken() {
  return randomBytes(32).toString("hex");
}

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function resetTokenTtlMs() {
  const hours = Number(process.env.RESET_TOKEN_HOURS || 1);
  return Math.max(0.25, hours) * 60 * 60 * 1000;
}

export function appPublicBaseUrl() {
  return (
    process.env.APP_PUBLIC_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

/** Demo/dev: trả link trong JSON; staging/prod chỉ log server (chưa SMTP). */
export function exposeResetLinkInResponse() {
  const v = process.env.EXPOSE_RESET_LINK;
  if (v === "1" || v === "true") return true;
  if (v === "0" || v === "false") return false;
  const appEnv = process.env.APP_ENV || process.env.NODE_ENV || "development";
  return appEnv === "development" || appEnv === "demo";
}
