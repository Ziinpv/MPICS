import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canControlDevice } from "@/lib/permissions";
import { jsonError, jsonOk } from "@/lib/api";

type Ctx = { params: { id: string } };

async function loadClusterInScope(id: string, orgPath: string) {
  return prisma.deviceCluster.findFirst({
    where: { id, org: { path: { startsWith: orgPath } } },
    include: { _count: { select: { devices: true } } },
  });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canControlDevice(user)) return jsonError("Forbidden", 403);

  const existing = await loadClusterInScope(params.id, user.orgPath);
  if (!existing) return jsonError("Not found", 404);

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (body.name != null) data.name = String(body.name).trim();
  if (body.description !== undefined) {
    data.description = body.description ? String(body.description) : null;
  }
  if (body.status != null) {
    if (!["active", "inactive"].includes(body.status)) {
      return jsonError("status phải là active|inactive");
    }
    data.status = body.status;
  }
  if (body.code != null) {
    const code = String(body.code).trim();
    const clash = await prisma.deviceCluster.findFirst({
      where: { orgId: existing.orgId, code, NOT: { id: existing.id } },
    });
    if (clash) return jsonError("Mã cụm đã tồn tại trong org");
    data.code = code;
  }

  const cluster = await prisma.deviceCluster.update({
    where: { id: params.id },
    data,
    include: {
      org: { select: { id: true, name: true, code: true } },
      _count: { select: { devices: true } },
    },
  });
  return jsonOk({ cluster });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canControlDevice(user)) return jsonError("Forbidden", 403);

  const existing = await loadClusterInScope(params.id, user.orgPath);
  if (!existing) return jsonError("Not found", 404);

  // Soft-delete nếu còn device; hard delete nếu trống
  if (existing._count.devices > 0) {
    const cluster = await prisma.deviceCluster.update({
      where: { id: params.id },
      data: { status: "inactive" },
    });
    return jsonOk({ cluster, softDeleted: true });
  }

  await prisma.deviceCluster.delete({ where: { id: params.id } });
  return jsonOk({ deleted: true });
}
