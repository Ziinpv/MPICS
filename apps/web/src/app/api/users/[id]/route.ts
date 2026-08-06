import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canManageUsers } from "@/lib/permissions";
import { jsonError, jsonOk } from "@/lib/api";
import { UserRole } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rateLimit";

type Ctx = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canManageUsers(user)) return jsonError("Forbidden", 403);

  const existing = await prisma.user.findUnique({ where: { id: params.id } });
  if (!existing) return jsonError("Not found", 404);

  const body = await req.json().catch(() => ({}));
  if (body.orgId) {
    const org = await prisma.organization.findUnique({ where: { id: body.orgId } });
    if (!org) return jsonError("Org không tồn tại", 404);
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: {
      fullName: body.fullName?.trim() ?? undefined,
      email: body.email !== undefined ? body.email?.trim() || null : undefined,
      phone: body.phone !== undefined ? body.phone?.trim() || null : undefined,
      role: body.role === "ADMIN" || body.role === "USER" ? (body.role as UserRole) : undefined,
      orgId: body.orgId ?? undefined,
      status: body.status ?? undefined,
    },
    include: { org: { select: { id: true, name: true, type: true, code: true } } },
  });

  await writeAuditLog({
    actor: user,
    action: "user.update",
    entityType: "User",
    entityId: updated.id,
    meta: { status: updated.status, role: updated.role, orgId: updated.orgId },
    ip: clientIp(req),
  });

  return jsonOk({
    user: {
      id: updated.id,
      username: updated.username,
      fullName: updated.fullName,
      email: updated.email,
      phone: updated.phone,
      role: updated.role,
      status: updated.status,
      orgId: updated.orgId,
      org: updated.org,
      mustChangePassword: updated.mustChangePassword,
    },
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canManageUsers(user)) return jsonError("Forbidden", 403);
  if (user.id === params.id) return jsonError("Không thể tự vô hiệu hóa tài khoản đang đăng nhập");

  const existing = await prisma.user.findUnique({ where: { id: params.id } });
  if (!existing) return jsonError("Not found", 404);

  await prisma.user.update({
    where: { id: params.id },
    data: { status: "inactive" },
  });

  await writeAuditLog({
    actor: user,
    action: "user.deactivate",
    entityType: "User",
    entityId: params.id,
    meta: { username: existing.username },
    ip: clientIp(req),
  });

  return jsonOk({ ok: true });
}
