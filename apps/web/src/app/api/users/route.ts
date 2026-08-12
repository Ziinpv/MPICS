import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession, validatePasswordStrength } from "@/lib/auth";
import { canManageUsers } from "@/lib/permissions";
import { jsonError, jsonOk } from "@/lib/api";
import { UserRole } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rateLimit";
import { sendAccountCredentialsMail } from "@/lib/accountMail";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canManageUsers(user)) return jsonError("Forbidden", 403);

  const q = new URL(req.url).searchParams.get("q")?.trim().toLowerCase() || "";
  const orgId = new URL(req.url).searchParams.get("org_id") || "";

  const users = await prisma.user.findMany({
    where: {
      ...(orgId ? { orgId } : {}),
      ...(q
        ? {
            OR: [
              { username: { contains: q, mode: "insensitive" } },
              { fullName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { org: { select: { id: true, name: true, type: true, code: true } } },
    orderBy: [{ role: "asc" }, { username: "asc" }],
  });

  return jsonOk({
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      role: u.role,
      status: u.status,
      orgId: u.orgId,
      org: u.org,
      mustChangePassword: u.mustChangePassword,
      createdAt: u.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canManageUsers(user)) return jsonError("Forbidden", 403);

  const body = await req.json().catch(() => null);
  const username = body?.username?.trim();
  const fullName = body?.fullName?.trim();
  const password = body?.password || "Demo@123";
  const email = body?.email?.trim() || null;
  const role = body?.role === "ADMIN" ? UserRole.ADMIN : UserRole.USER;
  const orgId = body?.orgId;
  const sendEmail = body?.sendEmail !== false;

  if (!username || !fullName || !orgId) {
    return jsonError("Thiếu username / fullName / orgId");
  }

  if (sendEmail && !email) {
    return jsonError("Cần email cá nhân để gửi thông báo tài khoản (hoặc tắt sendEmail)");
  }

  const strength = validatePasswordStrength(password);
  if (strength) return jsonError(strength);

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return jsonError("Org không tồn tại", 404);

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) return jsonError("Username đã tồn tại", 409);

  const created = await prisma.user.create({
    data: {
      username,
      fullName,
      email,
      phone: body.phone?.trim() || null,
      role,
      orgId,
      passwordHash: await bcrypt.hash(password, 10),
      status: "active",
      mustChangePassword: true,
    },
    include: { org: { select: { id: true, name: true, type: true, code: true } } },
  });

  let notified = sendEmail
    ? await sendAccountCredentialsMail({
        to: created.email,
        fullName: created.fullName,
        username: created.username,
        temporaryPassword: password,
        orgName: created.org?.name,
        kind: "created",
      })
    : { emailed: false as const, reason: "skipped" as const };

  await writeAuditLog({
    actor: user,
    action: "user.create",
    entityType: "User",
    entityId: created.id,
    meta: {
      username: created.username,
      role: created.role,
      orgId,
      email: created.email,
      notified,
    },
    ip: clientIp(req),
  });

  return jsonOk(
    {
      user: {
        id: created.id,
        username: created.username,
        fullName: created.fullName,
        email: created.email,
        phone: created.phone,
        role: created.role,
        status: created.status,
        orgId: created.orgId,
        org: created.org,
        mustChangePassword: created.mustChangePassword,
      },
      notified,
      message: notified.emailed
        ? `Đã tạo ${created.username} và gửi email tới ${created.email}`
        : `Đã tạo ${created.username}` +
          (notified.reason === "smtp_not_configured"
            ? " — chưa cấu hình SMTP (Mailpit/SMTP_*)"
            : notified.reason === "mail_error"
              ? ` — gửi mail lỗi: ${"detail" in notified ? notified.detail : ""}`
              : notified.reason === "skipped"
                ? " — không gửi email"
                : ""),
    },
    { status: 201 },
  );
}
