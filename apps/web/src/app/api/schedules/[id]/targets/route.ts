import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canManageSchedule } from "@/lib/permissions";
import { jsonError, jsonOk } from "@/lib/api";
import { resolveDevicesForTargets } from "@/lib/routing";

type Ctx = { params: { id: string } };

export async function PUT(req: NextRequest, { params }: Ctx) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canManageSchedule(user)) return jsonError("Forbidden", 403);

  const schedule = await prisma.broadcastSchedule.findUnique({
    where: { id: params.id },
    include: { campaign: { include: { org: true } } },
  });
  if (!schedule) return jsonError("Not found", 404);
  if (!schedule.campaign.org.path.startsWith(user.orgPath)) {
    return jsonError("Forbidden", 403);
  }

  const body = await req.json().catch(() => null);
  const raw = Array.isArray(body?.targets) ? body.targets : null;
  if (!raw?.length) return jsonError("Thiếu targets[]");

  const targets = raw.map((t: any) => ({
    clusterId: String(t.clusterId || t.cluster_id || ""),
    include: t.include !== false && t.include !== "false",
  }));
  if (targets.some((t: { clusterId: string }) => !t.clusterId)) {
    return jsonError("Mỗi target cần clusterId");
  }
  if (!targets.some((t: { include: boolean }) => t.include)) {
    return jsonError("Cần ít nhất 1 target include=true");
  }

  const clusterIds = [...new Set(targets.map((t: { clusterId: string }) => t.clusterId))];
  const clusters = await prisma.deviceCluster.findMany({
    where: {
      id: { in: clusterIds },
      org: { path: { startsWith: user.orgPath } },
    },
  });
  if (clusters.length !== clusterIds.length) {
    return jsonError("Một hoặc nhiều cluster ngoài phạm vi");
  }

  await prisma.$transaction([
    prisma.scheduleTarget.deleteMany({ where: { scheduleId: params.id } }),
    prisma.scheduleTarget.createMany({
      data: targets.map((t: { clusterId: string; include: boolean }) => ({
        scheduleId: params.id,
        clusterId: t.clusterId,
        include: t.include,
      })),
    }),
  ]);

  const updated = await prisma.broadcastSchedule.findUnique({
    where: { id: params.id },
    include: { targets: { include: { cluster: true } } },
  });
  const preview = await resolveDevicesForTargets(targets);

  return jsonOk({
    schedule: updated,
    resolvedCount: preview.length,
    resolvedDevices: preview,
  });
}
