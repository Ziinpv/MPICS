import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canControlDevice } from "@/lib/permissions";
import { jsonError, jsonOk } from "@/lib/api";
import { randomMqttPassword } from "@/lib/mediaSign";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rateLimit";

type Ctx = { params: { id: string } };

/** Rotate MQTT password — trả plaintext 1 lần. Cập nhật Mosquitto passwd bằng script sync. */
export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canControlDevice(user)) return jsonError("Forbidden", 403);

  const device = await prisma.device.findUnique({ where: { id: params.id } });
  if (!device) return jsonError("Not found", 404);

  const body = await req.json().catch(() => ({}));
  const password =
    typeof body.password === "string" && body.password.length >= 8
      ? body.password
      : randomMqttPassword();

  const hash = await bcrypt.hash(password, 10);
  const updated = await prisma.device.update({
    where: { id: params.id },
    data: { mqttPasswordHash: hash, mqttPasswordSetAt: new Date() },
  });

  await writeAuditLog({
    actor: user,
    action: "device.mqtt_rotate",
    entityType: "Device",
    entityId: device.id,
    meta: { deviceCode: device.deviceCode },
    ip: clientIp(req),
  });

  return jsonOk({
    deviceId: updated.id,
    deviceCode: updated.deviceCode,
    mqttUsername: updated.deviceCode,
    mqttPassword: password,
    hint: "Chạy scripts/gen-mqtt-passwd (hoặc docker mosquitto_passwd) rồi restart mosquitto",
  });
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canControlDevice(user)) return jsonError("Forbidden", 403);

  const device = await prisma.device.findUnique({ where: { id: params.id } });
  if (!device) return jsonError("Not found", 404);

  return jsonOk({
    deviceId: device.id,
    deviceCode: device.deviceCode,
    mqttUsername: device.deviceCode,
    hasPassword: Boolean(device.mqttPasswordHash),
    mqttPasswordSetAt: device.mqttPasswordSetAt,
  });
}
