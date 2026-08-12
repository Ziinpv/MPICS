import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";
import { recordPlayLogFromCommand } from "@/lib/playLog";
import { verifyMediaSignature } from "@/lib/mediaSign";

/** Simulator poll pending commands */
export async function GET(req: NextRequest) {
  const deviceId = new URL(req.url).searchParams.get("device_id");
  const deviceCode = new URL(req.url).searchParams.get("device_code");
  if (!deviceId && !deviceCode) return jsonError("Thiếu device_id hoặc device_code");

  const device = deviceId
    ? await prisma.device.findUnique({ where: { id: deviceId } })
    : await prisma.device.findUnique({ where: { deviceCode: deviceCode! } });
  if (!device) return jsonError("Device not found", 404);

  const commands = await prisma.deviceCommand.findMany({
    where: { deviceId: device.id, status: "pending" },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  return jsonOk({ deviceId: device.id, commands });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.commandId) return jsonError("Thiếu commandId");

  const existing = await prisma.deviceCommand.findUnique({ where: { id: body.commandId } });
  if (!existing) return jsonError("Command not found", 404);

  // Device từ chối play nếu chữ ký media không khớp
  if (existing.commandType === "play") {
    const payload = (existing.payload || {}) as {
      checksum?: string;
      storageKey?: string;
      signature?: string;
    };
    if (payload.checksum && payload.storageKey) {
      const ok = verifyMediaSignature(payload.checksum, payload.storageKey, payload.signature);
      if (!ok) {
        await prisma.deviceCommand.update({
          where: { id: existing.id },
          data: { status: "failed" },
        });
        await recordPlayLogFromCommand(existing.id, { error: "invalid_media_signature" });
        return jsonError("Device từ chối: chữ ký media không hợp lệ", 400);
      }
    }
  }

  const command = await prisma.deviceCommand.update({
    where: { id: body.commandId },
    data: { status: "acked", ackedAt: new Date() },
  });

  if (command.commandType === "set_volume" && command.payload && typeof command.payload === "object") {
    const volume = (command.payload as { volume?: number }).volume;
    if (volume != null) {
      await prisma.device.update({
        where: { id: command.deviceId },
        data: { volume },
      });
    }
  }

  let playLog = null;
  if (command.commandType === "play") {
    playLog = await recordPlayLogFromCommand(command.id, {
      error: typeof body.error === "string" ? body.error : undefined,
    });
  }

  return jsonOk({ command, playLog });
}
