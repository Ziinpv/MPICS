import { prisma } from "@/lib/prisma";

export type ResolvedDevice = {
  id: string;
  deviceCode: string;
  name: string;
  clusterId: string | null;
  online: boolean;
};

/**
 * NV08 resolve:
 * include = union devices in clusters with include=true
 * exclude = union devices in clusters with include=false
 * result = active devices in include \ exclude
 */
export async function resolveDevicesForTargets(
  targets: { clusterId: string; include: boolean }[],
): Promise<ResolvedDevice[]> {
  const includeIds = targets.filter((t) => t.include).map((t) => t.clusterId);
  const excludeIds = targets.filter((t) => !t.include).map((t) => t.clusterId);

  if (!includeIds.length) return [];

  const included = await prisma.device.findMany({
    where: { clusterId: { in: includeIds }, status: "active" },
    select: {
      id: true,
      deviceCode: true,
      name: true,
      clusterId: true,
      online: true,
    },
  });

  if (!excludeIds.length) return included;

  const excluded = await prisma.device.findMany({
    where: { clusterId: { in: excludeIds }, status: "active" },
    select: { id: true },
  });
  const ban = new Set(excluded.map((d) => d.id));
  return included.filter((d) => !ban.has(d.id));
}

export async function resolveDevicesForSchedule(scheduleId: string) {
  const targets = await prisma.scheduleTarget.findMany({
    where: { scheduleId },
    select: { clusterId: true, include: true },
  });
  return resolveDevicesForTargets(targets);
}
