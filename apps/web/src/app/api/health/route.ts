import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError } from "@/lib/api";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return jsonOk({
      ok: true,
      service: "mpcis-web",
      appEnv: process.env.APP_ENV || process.env.NODE_ENV || "development",
      mqttUrl: process.env.MQTT_URL || "mqtt://127.0.0.1:1883",
      time: new Date().toISOString(),
    });
  } catch {
    return jsonError("Database unavailable", 503);
  }
}
