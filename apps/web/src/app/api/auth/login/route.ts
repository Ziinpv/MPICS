import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setAuthCookie, signToken, clearAuthCookie } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`login:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 });
  if (!rl.ok) {
    return jsonError(`Quá nhiều lần đăng nhập. Thử lại sau ${rl.retryAfterSec}s`, 429);
  }

  const body = await req.json().catch(() => null);
  const username = body?.username?.trim();
  const password = body?.password;
  if (!username || !password) return jsonError("Thiếu username/password");

  const user = await prisma.user.findUnique({
    where: { username },
    include: { org: true },
  });
  if (!user || user.status !== "active") {
    await writeAuditLog({
      action: "auth.login_failed",
      meta: { username, reason: "not_found_or_inactive" },
      ip,
    });
    return jsonError("Sai tài khoản hoặc mật khẩu", 401);
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    await writeAuditLog({
      action: "auth.login_failed",
      meta: { username, reason: "bad_password" },
      ip,
    });
    return jsonError("Sai tài khoản hoặc mật khẩu", 401);
  }

  const session = {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    orgId: user.orgId,
    orgPath: user.org.path,
    orgName: user.org.name,
    mustChangePassword: user.mustChangePassword,
  };
  const token = await signToken(session);
  await setAuthCookie(token);

  await writeAuditLog({
    actor: session,
    action: "auth.login",
    entityType: "User",
    entityId: user.id,
    ip,
  });

  return jsonOk({
    user: session,
    mustChangePassword: user.mustChangePassword,
  });
}

export async function DELETE() {
  await clearAuthCookie();
  return jsonOk({ ok: true });
}
