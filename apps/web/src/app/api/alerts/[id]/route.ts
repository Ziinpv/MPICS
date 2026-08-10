import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { UserRole } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rateLimit";

type Ctx = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (user.role !== UserRole.ADMIN) return jsonError("Forbidden", 403);

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;
  const alert = await prisma.deviceAlert.findUnique({
    where: { id: params.id },
    include: { device: { include: { org: true } } },
  });
  if (!alert) return jsonError("Not found", 404);
  if (!alert.device.org.path.startsWith(user.orgPath)) {
    return jsonError("Forbidden", 403);
  }

  if (action === "ack") {
    const updated = await prisma.deviceAlert.update({
      where: { id: params.id },
      data: { status: "acked" },
    });
    await writeAuditLog({
      actor: user,
      action: "alert.ack",
      entityType: "DeviceAlert",
      entityId: params.id,
      ip: clientIp(req),
    });
    return jsonOk({ alert: updated });
  }

  if (action === "resolve") {
    const updated = await prisma.deviceAlert.update({
      where: { id: params.id },
      data: {
        status: "resolved",
        resolvedById: user.id,
        resolvedAt: new Date(),
      },
    });
    await writeAuditLog({
      actor: user,
      action: "alert.resolve",
      entityType: "DeviceAlert",
      entityId: params.id,
      ip: clientIp(req),
    });
    return jsonOk({ alert: updated });
  }

  return jsonError("action phải là ack|resolve");
}
