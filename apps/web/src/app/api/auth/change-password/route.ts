import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  getSession,
  setAuthCookie,
  signToken,
  validatePasswordStrength,
} from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { clientIp } from "@/lib/rateLimit";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  const currentPassword = body?.currentPassword;
  const newPassword = body?.newPassword;

  if (!currentPassword || !newPassword) {
    return jsonError("Thiếu mật khẩu hiện tại / mật khẩu mới");
  }

  const strength = validatePasswordStrength(newPassword);
  if (strength) return jsonError(strength);

  if (currentPassword === newPassword) {
    return jsonError("Mật khẩu mới phải khác mật khẩu hiện tại");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: { org: true },
  });
  if (!user || user.status !== "active") return jsonError("Unauthorized", 401);

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) return jsonError("Mật khẩu hiện tại không đúng", 401);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(newPassword, 10),
      mustChangePassword: false,
      passwordChangedAt: new Date(),
    },
  });

  const fresh = {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    orgId: user.orgId,
    orgPath: user.org.path,
    orgName: user.org.name,
    mustChangePassword: false,
  };
  await setAuthCookie(await signToken(fresh));

  await writeAuditLog({
    actor: fresh,
    action: "auth.change_password",
    entityType: "User",
    entityId: user.id,
    ip: clientIp(req),
  });

  return jsonOk({
    ok: true,
    user: fresh,
    redirectTo: fresh.role === "ADMIN" ? "/admin" : "/user",
  });
}
