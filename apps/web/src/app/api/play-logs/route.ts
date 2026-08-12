import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { UserRole } from "@prisma/client";

/** Admin: danh sách play log theo org scope */
export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (user.role !== UserRole.ADMIN) return jsonError("Forbidden", 403);

  const { searchParams } = new URL(req.url);
  const scheduleId = searchParams.get("schedule_id");
  const deviceCode = searchParams.get("device_code");
  const take = Math.min(Number(searchParams.get("limit") || 100), 500);

  const where: Record<string, unknown> = {
    device: { org: { path: { startsWith: user.orgPath } } },
  };
  if (scheduleId) where.scheduleId = scheduleId;
  if (deviceCode) {
    where.device = {
      org: { path: { startsWith: user.orgPath } },
      deviceCode,
    };
  }

  const logs = await prisma.devicePlayLog.findMany({
    where,
    take,
    orderBy: { playedAt: "desc" },
    include: {
      device: { select: { deviceCode: true, name: true, online: true } },
    },
  });

  return jsonOk({ logs, count: logs.length });
}
