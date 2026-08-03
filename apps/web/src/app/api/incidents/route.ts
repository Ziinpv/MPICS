import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { IncidentSeverity, UserRole } from "@prisma/client";

export async function GET() {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);

  const where =
    user.role === UserRole.USER
      ? { orgId: user.orgId }
      : { org: { path: { startsWith: user.orgPath } } };

  const incidents = await prisma.incidentReport.findMany({
    where,
    include: {
      device: true,
      reporter: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return jsonOk({ incidents });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);

  const body = await req.json().catch(() => null);
  if (!body?.deviceId || !body?.title || !body?.description) {
    return jsonError("Thiếu deviceId / title / description");
  }

  const device = await prisma.device.findUnique({ where: { id: body.deviceId } });
  if (!device) return jsonError("Device not found", 404);
  if (user.role === UserRole.USER && device.orgId !== user.orgId) {
    return jsonError("Forbidden", 403);
  }

  const incident = await prisma.incidentReport.create({
    data: {
      deviceId: device.id,
      reporterId: user.id,
      orgId: device.orgId,
      title: body.title,
      description: body.description,
      severity: (body.severity as IncidentSeverity) || "medium",
      photoKeys: body.photoKeys || [],
    },
  });
  return jsonOk({ incident }, { status: 201 });
}
