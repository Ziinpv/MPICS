import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canControlDevice } from "@/lib/permissions";
import { jsonError, jsonOk } from "@/lib/api";
import { DeviceStatus, DeviceType } from "@prisma/client";
import { DEVICE_TYPE_LABELS } from "@/lib/labels";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rateLimit";

type Ctx = { params: { id: string } };

const VALID_TYPES = new Set(Object.keys(DEVICE_TYPE_LABELS));

export async function GET(_req: NextRequest, { params }: Ctx) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);

  const device = await prisma.device.findFirst({
    where: { id: params.id, org: { path: { startsWith: user.orgPath } } },
    include: { cluster: true, org: true },
  });
  if (!device) return jsonError("Not found", 404);
  return jsonOk({ device });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canControlDevice(user)) return jsonError("Forbidden", 403);

  const existing = await prisma.device.findFirst({
    where: { id: params.id, org: { path: { startsWith: user.orgPath } } },
  });
  if (!existing) return jsonError("Not found", 404);

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (body.name != null) data.name = String(body.name).trim();
  if (body.address !== undefined) data.address = body.address ? String(body.address) : null;
  if (body.lat !== undefined) data.lat = body.lat == null || body.lat === "" ? null : Number(body.lat);
  if (body.lng !== undefined) data.lng = body.lng == null || body.lng === "" ? null : Number(body.lng);
  if (body.volumeDefault != null) data.volumeDefault = Number(body.volumeDefault);
  if (body.type != null) {
    if (!VALID_TYPES.has(body.type)) return jsonError("type không hợp lệ");
    data.type = body.type as DeviceType;
  }
  if (body.status != null) {
    const st = body.status as DeviceStatus;
    if (!["active", "maintenance", "retired"].includes(st)) {
      return jsonError("status phải là active|maintenance|retired");
    }
    data.status = st;
  }
  if (body.clusterId !== undefined) {
    if (body.clusterId === null || body.clusterId === "") {
      data.clusterId = null;
    } else {
      const cluster = await prisma.deviceCluster.findFirst({
        where: { id: body.clusterId, org: { path: { startsWith: user.orgPath } } },
      });
      if (!cluster) return jsonError("Cluster không hợp lệ");
      data.clusterId = cluster.id;
    }
  }

  const device = await prisma.device.update({
    where: { id: params.id },
    data,
    include: { cluster: true, org: true },
  });

  await writeAuditLog({
    actor: user,
    action: "device.update",
    entityType: "Device",
    entityId: device.id,
    meta: data,
    ip: clientIp(req),
  });

  return jsonOk({ device });
}
