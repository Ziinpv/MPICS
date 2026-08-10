import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError } from "@/lib/api";
import { validatePasswordStrength } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { writeAuditLog } from "@/lib/audit";
import { hashResetToken } from "@/lib/passwordReset";

/**
 * POST { token, newPassword }
 */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`reset:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 });
  if (!rl.ok) {
    return jsonError(`Quá nhiều yêu cầu. Thử lại sau ${rl.retryAfterSec}s`, 429);
  }

  const body = await req.json().catch(() => null);
  const token = String(body?.token || "").trim();
  const newPassword = body?.newPassword;
  if (!token || !newPassword) return jsonError("Thiếu token / mật khẩu mới");

  const strength = validatePasswordStrength(newPassword);
  if (strength) return jsonError(strength);

  const tokenHash = hashResetToken(token);
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    await writeAuditLog({
      action: "auth.reset_password_failed",
      meta: { reason: "invalid_or_expired" },
      ip,
    });
    return jsonError("Link đặt lại không hợp lệ hoặc đã hết hạn", 400);
  }

  if (row.user.status !== "active") {
    return jsonError("Tài khoản không hoạt động", 403);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 10),
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    }),
    prisma.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: row.userId, usedAt: null, id: { not: row.id } },
      data: { usedAt: new Date() },
    }),
  ]);

  await writeAuditLog({
    actor: {
      id: row.user.id,
      username: row.user.username,
      fullName: row.user.fullName,
      role: row.user.role,
      orgId: row.user.orgId,
      orgPath: "",
      orgName: "",
    },
    action: "auth.reset_password",
    entityType: "User",
    entityId: row.userId,
    ip,
  });

  return jsonOk({ ok: true, message: "Đã đặt lại mật khẩu. Hãy đăng nhập." });
}
