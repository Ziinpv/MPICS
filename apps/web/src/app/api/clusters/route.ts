import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canControlDevice, canAssignOrgId } from "@/lib/permissions";
import { jsonError, jsonOk } from "@/lib/api";
import { UserRole } from "@prisma/client";

export async function GET() {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);

  const where =
    user.role === UserRole.USER
      ? { orgId: user.orgId }
      : { org: { path: { startsWith: user.orgPath } } };

  const clusters = await prisma.deviceCluster.findMany({
    where,
    include: {
      org: { select: { id: true, name: true, code: true, path: true } },
      _count: { select: { devices: true } },
    },
    orderBy: { name: "asc" },
  });
  return jsonOk({ clusters });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canControlDevice(user)) return jsonError("Forbidden", 403);

  const body = await req.json().catch(() => null);
  if (!body?.code || !body?.name) return jsonError("Thiếu code / name");

  const orgId = (body.orgId as string) || user.orgId;
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org || !canAssignOrgId(user, org)) return jsonError("Org ngoài phạm vi", 403);

  const existing = await prisma.deviceCluster.findFirst({
    where: { orgId, code: String(body.code).trim() },
  });
  if (existing) return jsonError("Mã cụm đã tồn tại trong org");

  const cluster = await prisma.deviceCluster.create({
    data: {
      orgId,
      code: String(body.code).trim(),
      name: String(body.name).trim(),
      description: body.description ? String(body.description) : null,
      status: "active",
    },
    include: {
      org: { select: { id: true, name: true, code: true } },
      _count: { select: { devices: true } },
    },
  });
  return jsonOk({ cluster }, { status: 201 });
}
