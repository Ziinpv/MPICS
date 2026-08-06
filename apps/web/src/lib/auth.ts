import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

export const COOKIE = "mpcis_token";

/** Mặc định 8h (staging-friendly). Demo local có thể đặt JWT_EXPIRES_IN=7d */
export function jwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN?.trim() || "8h";
}

function jwtMaxAgeSeconds() {
  const raw = jwtExpiresIn();
  const m = /^(\d+)([smhd])$/i.exec(raw);
  if (!m) return 60 * 60 * 8;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  if (unit === "s") return n;
  if (unit === "m") return n * 60;
  if (unit === "h") return n * 3600;
  if (unit === "d") return n * 86400;
  return 60 * 60 * 8;
}

export function getJwtSecretBytes() {
  const value = process.env.JWT_SECRET?.trim();
  const appEnv = process.env.APP_ENV || process.env.NODE_ENV || "development";
  if (!value) {
    if (appEnv === "production" || appEnv === "staging") {
      throw new Error("JWT_SECRET is required when APP_ENV is staging/production");
    }
    return new TextEncoder().encode("mpcis-demo-secret");
  }
  if (
    (appEnv === "production" || appEnv === "staging") &&
    (value === "mpcis-demo-secret" || value === "mpcis-demo-secret-change-me")
  ) {
    throw new Error("JWT_SECRET must not use the demo default in staging/production");
  }
  return new TextEncoder().encode(value);
}

function cookieSecure() {
  if (process.env.COOKIE_SECURE === "1" || process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "0" || process.env.COOKIE_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
}

export type SessionUser = {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  orgId: string;
  orgPath: string;
  orgName: string;
  mustChangePassword?: boolean;
};

export async function signToken(user: SessionUser) {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(jwtExpiresIn())
    .sign(getJwtSecretBytes());
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretBytes());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string) {
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: jwtMaxAgeSeconds(),
    secure: cookieSecure(),
  });
}

export async function clearAuthCookie() {
  cookies().set(COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    secure: cookieSecure(),
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getSessionFromRequest(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function requireAdmin(user: SessionUser | null) {
  if (!user || user.role !== UserRole.ADMIN) {
    throw new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }
}

export function requireUser(user: SessionUser | null) {
  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
}

/** Mật khẩu tối thiểu cho staging/prod (demo local vẫn chấp nhận ngắn hơn nếu APP_ENV=development) */
export function validatePasswordStrength(password: string): string | null {
  if (!password || password.length < 8) return "Mật khẩu tối thiểu 8 ký tự";
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Mật khẩu cần có chữ và số";
  }
  return null;
}
