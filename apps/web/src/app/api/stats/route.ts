import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { UserRole } from "@prisma/client";

export async function GET() {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (user.role !== UserRole.ADMIN) return jsonError("Forbidden", 403);

  const orgFilter = { path: { startsWith: user.orgPath } };

  const [devicesOnline, devicesTotal, locationsCount, incidentsOpen, schedulesToday, recentCommands] =
    await Promise.all([
      prisma.device.count({ where: { online: true, org: orgFilter } }),
      prisma.device.count({ where: { org: orgFilter } }),
      prisma.location.count({ where: { org: orgFilter } }),
      prisma.incidentReport.count({ where: { status: "open", org: orgFilter } }),
      prisma.broadcastSchedule.count({
        where: {
          startAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
      prisma.deviceCommand.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { device: { select: { name: true, deviceCode: true } } },
      }),
    ]);

  return jsonOk({
    devicesOnline,
    devicesTotal,
    locationsCount,
    incidentsOpen,
    schedulesToday,
    recentCommands,
  });
}
