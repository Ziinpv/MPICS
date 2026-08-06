import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession, validatePasswordStrength } from "@/lib/auth";
import { canManageUsers } from "@/lib/permissions";
import { jsonError, jsonOk } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rateLimit";

type Ctx = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canManageUsers(user)) return jsonError("Forbidden", 403);

  const existing = await prisma.user.findUnique({ where: { id: params.id } });
  if (!existing) return jsonError("Not found", 404);

  const body = await req.json().catch(() => ({}));
  const password = body.password?.trim() || "Demo@123";
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

  await writeAuditLog({
    actor: user,
    action: "user.reset_password",
    entityType: "User",
    entityId: params.id,
    meta: { username: existing.username },
    ip: clientIp(req),
  });

  return jsonOk({
    ok: true,
    message: `Đã reset mật khẩu cho ${existing.username}. User phải đổi MK lần đăng nhập tiếp theo.`,
  });
}
