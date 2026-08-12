import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession, validatePasswordStrength } from "@/lib/auth";
import { canManageUsers } from "@/lib/permissions";
import { jsonError, jsonOk } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rateLimit";
import { sendAccountCredentialsMail } from "@/lib/accountMail";

type Ctx = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canManageUsers(user)) return jsonError("Forbidden", 403);

  const existing = await prisma.user.findUnique({
    where: { id: params.id },
    include: { org: { select: { name: true } } },
  });
  if (!existing) return jsonError("Not found", 404);

  const body = await req.json().catch(() => ({}));
  const password = body.password?.trim() || "Demo@123";
  const sendEmail = body.sendEmail !== false;
  const strength = validatePasswordStrength(password);
  if (strength) return jsonError(strength);

  await prisma.user.update({
    where: { id: params.id },
    data: {
      passwordHash: await bcrypt.hash(password, 10),
      mustChangePassword: true,
      passwordChangedAt: null,
    },
  });

  const notified = sendEmail
    ? await sendAccountCredentialsMail({
        to: existing.email,
        fullName: existing.fullName,
        username: existing.username,
        temporaryPassword: password,
        orgName: existing.org?.name,
        kind: "password_reset",
      })
    : { emailed: false as const, reason: "skipped" as const };

  await writeAuditLog({
    actor: user,
    action: "user.reset_password",
    entityType: "User",
    entityId: params.id,
    meta: { username: existing.username, notified },
    ip: clientIp(req),
  });

  let message = `Đã reset mật khẩu cho ${existing.username}. User phải đổi MK lần đăng nhập tiếp theo.`;
  if (notified.emailed) {
    message += ` Đã gửi email tới ${existing.email}.`;
  } else if (sendEmail && notified.reason === "no_email") {
    message += " User chưa có email — không gửi được thông báo.";
  } else if (sendEmail && notified.reason === "smtp_not_configured") {
    message += " Chưa cấu hình SMTP (Mailpit).";
  } else if (sendEmail && notified.reason === "mail_error") {
    message += ` Gửi mail lỗi: ${"detail" in notified ? notified.detail : ""}`;
  }

  return jsonOk({
    ok: true,
    message,
    notified,
  });
}
