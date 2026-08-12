import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canControlDevice, canAssignOrgId } from "@/lib/permissions";
import { jsonError, jsonOk } from "@/lib/api";
import { DeviceType, UserRole } from "@prisma/client";
import { DEVICE_TYPE_LABELS } from "@/lib/labels";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rateLimit";

const VALID_DEVICE_TYPES = new Set(Object.keys(DEVICE_TYPE_LABELS));

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const deviceType = searchParams.get("device_type") as DeviceType | null;

  if (deviceType && !VALID_DEVICE_TYPES.has(deviceType)) {
    return jsonError(
      `device_type không hợp lệ. Hỗ trợ: ${Array.from(VALID_DEVICE_TYPES).join(", ")}`,
    );
  }

  const where: Record<string, unknown> =
    user.role === UserRole.USER
      ? { orgId: user.orgId }
      : { org: { path: { startsWith: user.orgPath } } };

  if (deviceType) where.type = deviceType;

  const devices = await prisma.device.findMany({
    where,
    include: { cluster: true, org: true },
    orderBy: { name: "asc" },
  });
  return jsonOk({
    devices,
    deviceTypeLabels: DEVICE_TYPE_LABELS,
  });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canControlDevice(user)) return jsonError("Forbidden", 403);

  const body = await req.json().catch(() => null);
  if (!body?.deviceCode || !body?.name) {
    return jsonError("Thiếu deviceCode / name");
  }

  const orgId = (body.orgId as string) || user.orgId;
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org || !canAssignOrgId(user, org)) return jsonError("Org ngoài phạm vi", 403);

  const type = (body.type as DeviceType) || "communication_device";
  if (!VALID_DEVICE_TYPES.has(type)) return jsonError("type không hợp lệ");

  let clusterId: string | null = body.clusterId || null;
  if (clusterId) {
    const cluster = await prisma.deviceCluster.findFirst({
      where: { id: clusterId, org: { path: { startsWith: user.orgPath } } },
    });
    if (!cluster) return jsonError("Cluster không hợp lệ", 400);
  }

  const code = String(body.deviceCode).trim();
  const clash = await prisma.device.findUnique({ where: { deviceCode: code } });
  if (clash) return jsonError("deviceCode đã tồn tại");

  const device = await prisma.device.create({
    data: {
      orgId,
      clusterId,
      deviceCode: code,
      name: String(body.name).trim(),
      type,
      lat: body.lat != null ? Number(body.lat) : null,
      lng: body.lng != null ? Number(body.lng) : null,
      address: body.address ? String(body.address) : null,
      status: "active",
    },
    include: { cluster: true, org: true },
  });

  await writeAuditLog({
    actor: user,
    action: "device.create",
    entityType: "Device",
    entityId: device.id,
    meta: { deviceCode: device.deviceCode },
    ip: clientIp(req),
  });

  return jsonOk({ device }, { status: 201 });
}
