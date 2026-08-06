import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { DeviceType, UserRole } from "@prisma/client";
import { DEVICE_TYPE_LABELS } from "@/lib/labels";

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
