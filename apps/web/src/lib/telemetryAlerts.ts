import { prisma } from "@/lib/prisma";

const DEFAULT_OFFLINE_MINUTES = Number(process.env.DEVICE_OFFLINE_MINUTES || 15);

/**
 * Quét thiết bị offline quá X phút → tạo DeviceAlert (không spam nếu đã có open).
 * Recover online → auto-resolve alert offline.
 */
export async function scanDeviceOfflineAlerts(
  offlineMinutes = DEFAULT_OFFLINE_MINUTES,
) {
  const cutoff = new Date(Date.now() - offlineMinutes * 60 * 1000);

  const stale = await prisma.device.findMany({
    where: {
      status: "active",
      OR: [
        { lastSeenAt: { lt: cutoff } },
        { AND: [{ lastSeenAt: null }, { updatedAt: { lt: cutoff } }] },
      ],
    },
    select: {
      id: true,
      name: true,
      deviceCode: true,
      online: true,
      lastSeenAt: true,
    },
  });

  let created = 0;
  let markedOffline = 0;

  for (const d of stale) {
    if (d.online) {
      await prisma.device.update({
        where: { id: d.id },
        data: { online: false },
      });
      markedOffline += 1;
    }

    const existing = await prisma.deviceAlert.findFirst({
      where: { deviceId: d.id, type: "offline", status: "open" },
    });
    if (existing) continue;

    const mins = d.lastSeenAt
      ? Math.floor((Date.now() - d.lastSeenAt.getTime()) / 60000)
      : offlineMinutes;

    await prisma.deviceAlert.create({
      data: {
        deviceId: d.id,
        type: "offline",
        severity: "high",
        status: "open",
        message: `Thiết bị ${d.deviceCode} offline > ${offlineMinutes} phút (lastSeen ~${mins}p trước)`,
        offlineMinutes: mins,
      },
    });
    created += 1;
  }

  // Auto-resolve khi device online lại
  const openOffline = await prisma.deviceAlert.findMany({
    where: { type: "offline", status: "open" },
    include: { device: { select: { id: true, online: true, lastSeenAt: true } } },
  });

  let resolved = 0;
  for (const a of openOffline) {
    const fresh =
      a.device.online &&
      a.device.lastSeenAt &&
      a.device.lastSeenAt.getTime() >= cutoff.getTime();
    if (!fresh) continue;
    await prisma.deviceAlert.update({
      where: { id: a.id },
      data: { status: "resolved", resolvedAt: new Date() },
    });
    resolved += 1;
  }

  return {
    offlineMinutes,
    scannedStale: stale.length,
    markedOffline,
    alertsCreated: created,
    alertsResolved: resolved,
  };
}
