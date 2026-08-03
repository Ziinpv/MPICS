import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";

/** Simulator heartbeat — không cần JWT (demo) */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.deviceId && !body?.deviceCode) {
    return jsonError("Thiếu deviceId hoặc deviceCode");
  }

  const device = body.deviceId
    ? await prisma.device.findUnique({ where: { id: body.deviceId } })
    : await prisma.device.findUnique({ where: { deviceCode: body.deviceCode } });

  if (!device) return jsonError("Device not found", 404);

  const updated = await prisma.device.update({
    where: { id: device.id },
    data: {
      online: true,
      lastSeenAt: new Date(),
      rssi: body.rssi ?? -72,
      volume: body.volume ?? device.volume,
    },
  });

  return jsonOk({ device: updated });
}
