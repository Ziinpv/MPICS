import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canManageLocationTypes } from "@/lib/permissions";
import { jsonError, jsonOk } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rateLimit";

type Ctx = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canManageLocationTypes(user)) return jsonError("Forbidden", 403);

  const existing = await prisma.locationTypeDef.findUnique({ where: { id: params.id } });
  if (!existing) return jsonError("Not found", 404);

  const body = await req.json().catch(() => ({}));
  const item = await prisma.locationTypeDef.update({
    where: { id: params.id },
    data: {
      name: body.name?.trim() ?? undefined,
      active: typeof body.active === "boolean" ? body.active : undefined,
      sortOrder: body.sortOrder != null ? Number(body.sortOrder) : undefined,
    },
  });

  await writeAuditLog({
    actor: user,
    action: "location_type.update",
    entityType: "LocationTypeDef",
    entityId: item.id,
    meta: { name: item.name, active: item.active },
    ip: clientIp(req),
  });

  return jsonOk({ item });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canManageLocationTypes(user)) return jsonError("Forbidden", 403);

  const existing = await prisma.locationTypeDef.findUnique({ where: { id: params.id } });
  if (!existing) return jsonError("Not found", 404);

  const item = await prisma.locationTypeDef.update({
    where: { id: params.id },
    data: { active: false },
  });

  await writeAuditLog({
    actor: user,
    action: "location_type.deactivate",
    entityType: "LocationTypeDef",
    entityId: item.id,
    meta: { code: item.code, groupType: item.groupType },
    ip: clientIp(req),
  });

  return jsonOk({ item, ok: true });
}
