import { prisma } from "@/lib/prisma";

/** Tạo lệnh play cho mọi device active trong target clusters của lịch */
export async function publishScheduleCommands(input: {
  scheduleId: string;
  issuedById?: string | null;
}) {
  const schedule = await prisma.broadcastSchedule.findUnique({
    where: { id: input.scheduleId },
    include: {
      campaign: true,
      items: { include: { mediaAsset: true, content: true } },
      targets: true,
    },
  });
  if (!schedule) throw new Error("Schedule not found");

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
          issuedById: input.issuedById || schedule.createdById || undefined,
          status: "pending",
          scheduleId: schedule.id,
        },
      }),
    ),
  );

  const isPeriodic = schedule.campaign.type === "periodic" && (schedule.intervalMinutes || 0) > 0;
  const nextRunAt = isPeriodic
    ? new Date(Date.now() + (schedule.intervalMinutes || 60) * 60 * 1000)
    : null;

  await prisma.broadcastSchedule.update({
    where: { id: schedule.id },
    data: {
      status: isPeriodic ? "scheduled" : "running",
      nextRunAt: nextRunAt ?? undefined,
    },
  });

  if (item?.contentId && !isPeriodic) {
    await prisma.content.update({
      where: { id: item.contentId },
      data: { status: "scheduled" },
    });
  }

  return {
    schedule,
    commands,
    commandsCreated: commands.length,
    isPeriodic,
    nextRunAt,
  };
}

/** Chạy các lịch periodic đến hạn */
export async function runDuePeriodicSchedules() {
  const now = new Date();
  const due = await prisma.broadcastSchedule.findMany({
    where: {
      campaign: { type: "periodic" },
      intervalMinutes: { gt: 0 },
      status: { in: ["scheduled", "running"] },
      AND: [
        {
          OR: [
            { nextRunAt: { lte: now } },
            { AND: [{ nextRunAt: null }, { startAt: { lte: now } }] },
          ],
        },
        {
          OR: [{ endAt: null }, { endAt: { gt: now } }],
        },
      ],
    },
    include: { campaign: true },
    take: 20,
  });

  const results = [];
  for (const s of due) {
    if (!s.intervalMinutes) continue;
    const r = await publishScheduleCommands({
      scheduleId: s.id,
      issuedById: s.createdById,
    });
    results.push({
      scheduleId: s.id,
      name: s.name,
      commandsCreated: r.commandsCreated,
      nextRunAt: r.nextRunAt,
    });
  }
  return results;
}

/** pending/sent quá hạn → timeout */
export async function timeoutStaleCommands(minutes = Number(process.env.COMMAND_TIMEOUT_MINUTES || 5)) {
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);
  const result = await prisma.deviceCommand.updateMany({
    where: {
      status: { in: ["pending", "sent"] },
      OR: [
        { sentAt: { lt: cutoff } },
        { sentAt: null, createdAt: { lt: cutoff } },
      ],
    },
    data: { status: "timeout" },
  });
  return { timedOut: result.count, minutes };
}
