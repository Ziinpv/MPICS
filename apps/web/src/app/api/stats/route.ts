import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { CommandStatus, UserRole } from "@prisma/client";
import { LOCATION_TYPE_LABELS } from "@/lib/labels";

export async function GET() {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (user.role !== UserRole.ADMIN) return jsonError("Forbidden", 403);

  const orgFilter = { path: { startsWith: user.orgPath } };
  const locationWhere = { org: orgFilter };
  const deviceWhere = { org: orgFilter };
  const commandWhere = { device: deviceWhere };

  const startYear = new Date(new Date().getFullYear(), 0, 1);
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date();
  dayEnd.setHours(23, 59, 59, 999);

  const statuses: CommandStatus[] = ["pending", "sent", "acked", "failed", "timeout"];

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
    commandGroup,
    commandsToday,
  ] = await Promise.all([
    prisma.device.count({ where: { online: true, ...deviceWhere } }),
    prisma.device.count({ where: deviceWhere }),
    prisma.location.count({ where: locationWhere }),
    prisma.locationMedia.count({ where: { location: locationWhere } }),
    prisma.incidentReport.count({ where: { status: "open", org: orgFilter } }),
    prisma.broadcastSchedule.count({
      where: {
        startAt: { gte: dayStart, lt: dayEnd },
        campaign: { org: orgFilter },
      },
    }),
    prisma.deviceCommand.findMany({
      where: commandWhere,
      take: 40,
      orderBy: { createdAt: "desc" },
      include: {
        device: { select: { name: true, deviceCode: true, online: true } },
      },
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
    prisma.deviceCommand.groupBy({
      by: ["status"],
      where: commandWhere,
      _count: { _all: true },
    }),
    prisma.deviceCommand.count({
      where: { ...commandWhere, createdAt: { gte: dayStart } },
    }),
  ]);

  const commandCounts: Record<string, number> = Object.fromEntries(
    statuses.map((s) => [s, 0]),
  );
  for (const row of commandGroup) {
    commandCounts[row.status] = row._count._all;
  }

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
    commandCounts,
    commandsToday,
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
