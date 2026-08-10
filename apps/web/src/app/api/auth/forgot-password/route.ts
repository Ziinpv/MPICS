import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { writeAuditLog } from "@/lib/audit";
import {
  appPublicBaseUrl,
  exposeResetLinkInResponse,
  generateResetToken,
  hashResetToken,
  resetTokenTtlMs,
} from "@/lib/passwordReset";

/**
 * POST { usernameOrEmail }
 * Luôn trả thông điệp chung (tránh lộ user tồn tại).
 */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`forgot:${ip}`, { limit: 5, windowMs: 15 * 60 * 1000 });
  if (!rl.ok) {
    return jsonError(`Quá nhiều yêu cầu. Thử lại sau ${rl.retryAfterSec}s`, 429);
  }

  const body = await req.json().catch(() => null);
  const raw = String(body?.usernameOrEmail || body?.username || body?.email || "").trim();
  if (!raw) return jsonError("Nhập username hoặc email");

  const user = await prisma.user.findFirst({
    where: {
      status: "active",
      OR: [
        { username: { equals: raw, mode: "insensitive" } },
        { email: { equals: raw, mode: "insensitive" } },
      ],
    },
  });

  const generic =
    "Nếu tài khoản tồn tại, hướng dẫn đặt lại mật khẩu đã được tạo. Kiểm tra email hoặc liên hệ quản trị.";

  if (!user) {
    await writeAuditLog({
      action: "auth.forgot_password",
      meta: { raw, found: false },
      ip,
    });
    return jsonOk({ ok: true, message: generic });
  }

  // Vô hiệu token cũ chưa dùng
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + resetTokenTtlMs());
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashResetToken(token),
      expiresAt,
    },
  });

  const resetUrl = `${appPublicBaseUrl()}/reset-password?token=${token}`;
  console.info(`[password-reset] user=${user.username} url=${resetUrl}`);

  let mailSent = false;
  let mailError: string | null = null;
  if (user.email) {
    try {
      const { sendMail, smtpConfigured } = await import("@/lib/mail");
      if (smtpConfigured()) {
        await sendMail({
          to: user.email,
          subject: "[MPCIS] Đặt lại mật khẩu",
          text: [
            `Xin chào ${user.fullName},`,
            "",
            "Bạn (hoặc quản trị) đã yêu cầu đặt lại mật khẩu MPCIS.",
            `Mở liên kết sau (hết hạn ${expiresAt.toLocaleString("vi-VN")}):`,
            resetUrl,
            "",
            "Nếu không phải bạn, hãy bỏ qua email này.",
          ].join("\n"),
        });
        mailSent = true;
      }
    } catch (err: any) {
      mailError = err?.message || "SMTP error";
      console.error("[password-reset] SMTP", mailError);
    }
  }

  await writeAuditLog({
    actor: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      orgId: user.orgId,
      orgPath: "",
      orgName: "",
    },
    action: "auth.forgot_password",
    entityType: "User",
    entityId: user.id,
    meta: {
      found: true,
      expiresAt: expiresAt.toISOString(),
      mailSent,
      mailError,
      hasEmail: Boolean(user.email),
    },
    ip,
  });

  return jsonOk({
    ok: true,
    message: mailSent
      ? "Nếu tài khoản tồn tại và có email, hướng dẫn đặt lại mật khẩu đã được gửi."
      : generic,
    ...(exposeResetLinkInResponse()
      ? {
          resetUrl,
          expiresAt,
          mailSent,
          demoHint: "Chỉ hiện link trên môi trường demo/dev",
        }
      : { mailSent }),
  });
}
