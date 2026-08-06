import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError } from "@/lib/api";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return jsonOk({
      ok: true,
      service: "mpcis-web",
      appEnv: process.env.APP_ENV || process.env.NODE_ENV || "development",
      time: new Date().toISOString(),
    });
  } catch {
    return jsonError("Database unavailable", 503);
  }
}
