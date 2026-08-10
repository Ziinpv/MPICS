import { prisma } from "@/lib/prisma";

/** Phút trong ngày theo timezone Asia/Ho_Chi_Minh (UTC+7 cố định, đủ cho local/demo) */
export function minutesOfDay(date = new Date(), timezone = "Asia/Ho_Chi_Minh"): number {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);
    const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
    const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);
    return hour * 60 + minute;
  } catch {
    return date.getHours() * 60 + date.getMinutes();
  }
}

/** Trong khung giờ phát? Null window = cả ngày. Hỗ trợ cửa sổ qua nửa đêm (start > end). */
export function isWithinDailyWindow(
  now: Date,
  windowStartMin: number | null | undefined,
  windowEndMin: number | null | undefined,
  timezone = "Asia/Ho_Chi_Minh",
): boolean {
  if (windowStartMin == null || windowEndMin == null) return true;
  const m = minutesOfDay(now, timezone);
  if (windowStartMin === windowEndMin) return true;
  if (windowStartMin < windowEndMin) {
    return m >= windowStartMin && m < windowEndMin;
  }
  return m >= windowStartMin || m < windowEndMin;
}

/** Emergency preempt: dừng lệnh play đang chờ/đang gửi trên cùng device */
async function preemptLowerPriority(deviceIds: string[], emergencyScheduleId: string) {
  if (!deviceIds.length) return { stopped: 0 };
  const stale = await prisma.deviceCommand.findMany({
    where: {
      deviceId: { in: deviceIds },
      commandType: "play",
      status: { in: ["pending", "sent"] },
      OR: [{ scheduleId: null }, { scheduleId: { not: emergencyScheduleId } }],
    },
    select: { id: true, deviceId: true },
  });
  if (!stale.length) return { stopped: 0 };

  await prisma.deviceCommand.updateMany({
    where: { id: { in: stale.map((c) => c.id) } },
    data: { status: "failed" },
  });

  const uniqueDevices = [...new Set(stale.map((c) => c.deviceId))];
  await Promise.all(
    uniqueDevices.map((deviceId) =>
      prisma.deviceCommand.create({
        data: {
          deviceId,
          commandType: "stop",
          payload: { reason: "emergency_preempt", byScheduleId: emergencyScheduleId },
          status: "pending",
          scheduleId: emergencyScheduleId,
        },
      }),
    ),
  );

  return { stopped: stale.length };
}

/** Tạo lệnh play cho mọi device active trong target clusters của lịch */
export async function publishScheduleCommands(input: {
  scheduleId: string;
  issuedById?: string | null;
  /** Bỏ qua kiểm tra khung giờ (publish thủ công vẫn có thể force) */
  forceWindow?: boolean;
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

  const now = new Date();
  if (
    !input.forceWindow &&
    !isWithinDailyWindow(now, schedule.windowStartMin, schedule.windowEndMin, schedule.timezone)
  ) {
    throw new Error(
      `Ngoài khung giờ phát (${fmtMin(schedule.windowStartMin)}–${fmtMin(schedule.windowEndMin)})`,
    );
  }

  const includeClusterIds = schedule.targets.filter((t) => t.include).map((t) => t.clusterId);
  const devices = await prisma.device.findMany({
    where: { clusterId: { in: includeClusterIds }, status: "active" },
  });

  const isEmergency = schedule.campaign.type === "emergency" || schedule.preempt;
  let preempted = { stopped: 0 };
  if (isEmergency) {
    preempted = await preemptLowerPriority(
      devices.map((d) => d.id),
      schedule.id,
    );
  }

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
            preempt: isEmergency,
            priority: isEmergency ? "emergency" : "normal",
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
    preempted: preempted.stopped,
  };
}

function fmtMin(m: number | null | undefined) {
  if (m == null) return "—";
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** Chạy các lịch periodic đến hạn (có kiểm tra khung giờ) */
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
    if (!isWithinDailyWindow(now, s.windowStartMin, s.windowEndMin, s.timezone)) {
      results.push({
        scheduleId: s.id,
        name: s.name,
        skipped: "outside_window",
        commandsCreated: 0,
      });
      continue;
    }
    const r = await publishScheduleCommands({
      scheduleId: s.id,
      issuedById: s.createdById,
    });
    results.push({
      scheduleId: s.id,
      name: s.name,
      commandsCreated: r.commandsCreated,
      nextRunAt: r.nextRunAt,
      preempted: r.preempted,
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
