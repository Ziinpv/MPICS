import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canManageSchedule } from "@/lib/permissions";
import { jsonError, jsonOk } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rateLimit";

type Ctx = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canManageSchedule(user)) return jsonError("Forbidden", 403);

  const schedule = await prisma.broadcastSchedule.findUnique({
    where: { id: params.id },
    include: {
      items: { include: { mediaAsset: true, content: true } },
      targets: true,
    },
  });
  if (!schedule) return jsonError("Not found", 404);

  const includeClusterIds = schedule.targets.filter((t) => t.include).map((t) => t.clusterId);
  const devices = await prisma.device.findMany({
    where: { clusterId: { in: includeClusterIds }, status: "active" },
  });

  const item = schedule.items[0];
  const commands = await Promise.all(
    devices.map((d) =>
      prisma.deviceCommand.create({
        data: {
          deviceId: d.id,
          commandType: "play",
          payload: {
            scheduleId: schedule.id,
            mediaUrl: item?.mediaAsset?.cdnUrl,
            signature: item?.mediaAsset?.signature,
            title: item?.content?.title,
          },
          issuedById: user.id,
          status: "pending",
          scheduleId: schedule.id,
        },
      }),
    ),
  );

  await prisma.broadcastSchedule.update({
    where: { id: schedule.id },
    data: { status: "running" },
  });

  if (item?.contentId) {
    await prisma.content.update({
      where: { id: item.contentId },
      data: { status: "scheduled" },
    });
  }

  await writeAuditLog({
    actor: user,
    action: "schedule.publish",
    entityType: "BroadcastSchedule",
    entityId: schedule.id,
    meta: { commandsCreated: commands.length, deviceCount: devices.length },
    ip: clientIp(req),
  });

  return jsonOk({
    scheduleId: schedule.id,
    commandsCreated: commands.length,
    commands,
  });
}
