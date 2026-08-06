import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { UserRole } from "@prisma/client";
import { LOCATION_TYPE_LABELS } from "@/lib/labels";

export async function GET() {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (user.role !== UserRole.ADMIN) return jsonError("Forbidden", 403);

  const orgFilter = { path: { startsWith: user.orgPath } };
  const locationWhere = { org: orgFilter };

  const startYear = new Date(new Date().getFullYear(), 0, 1);

  const [
    devicesOnline,
    devicesTotal,
    locationsCount,
    mediaCount,
    incidentsOpen,
    schedulesToday,
    recentCommands,
    locations,
    recentLocations,
  ] = await Promise.all([
    prisma.device.count({ where: { online: true, org: orgFilter } }),
    prisma.device.count({ where: { org: orgFilter } }),
    prisma.location.count({ where: locationWhere }),
    prisma.locationMedia.count({ where: { location: locationWhere } }),
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
    prisma.location.findMany({
      where: locationWhere,
      select: { locationType: true, createdAt: true },
    }),
    prisma.location.findMany({
      where: locationWhere,
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { org: { select: { name: true } } },
    }),
  ]);

  const typeSet = new Set(locations.map((l) => l.locationType));
  const locationTypesCount = typeSet.size || Object.keys(LOCATION_TYPE_LABELS).length;

  const byTypeMap = new Map<string, number>();
  for (const l of locations) {
    byTypeMap.set(l.locationType, (byTypeMap.get(l.locationType) || 0) + 1);
  }
  const byType = Array.from(byTypeMap.entries()).map(([type, count]) => ({
    type,
    label: LOCATION_TYPE_LABELS[type] || type,
    count,
  }));

  const months = Array.from({ length: 12 }, (_, i) => 0);
  for (const l of locations) {
    if (l.createdAt >= startYear) {
      months[l.createdAt.getMonth()] += 1;
    }
  }

  return jsonOk({
    devicesOnline,
    devicesTotal,
    locationsCount,
    mediaCount,
    locationTypesCount,
    incidentsOpen,
    schedulesToday,
    recentCommands,
    byType,
    locationsByMonth: months,
    recentLocations: recentLocations.map((l) => ({
      id: l.id,
      name: l.name,
      locationType: l.locationType,
      orgName: l.org?.name,
      createdAt: l.createdAt,
    })),
  });
}
