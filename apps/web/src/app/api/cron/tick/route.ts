import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { runDuePeriodicSchedules, timeoutStaleCommands } from "@/lib/scheduleJobs";
import { scanDeviceOfflineAlerts } from "@/lib/telemetryAlerts";
import { UserRole } from "@prisma/client";

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const header = req.headers.get("x-cron-secret") || "";
  if (secret && header === secret) return true;
  return false;
}

/** Cron tick: timeout lệnh + lịch periodic + offline alerts */
export async function POST(req: NextRequest) {
  const session = await getSession();
  const okCron = authorized(req);
  if (!okCron && (!session || session.role !== UserRole.ADMIN)) {
    return jsonError("Forbidden", 403);
  }

  const body = await req.json().catch(() => ({}));
  const timeoutMinutes = body.timeoutMinutes != null ? Number(body.timeoutMinutes) : undefined;
  const offlineMinutes =
    body.offlineMinutes != null ? Number(body.offlineMinutes) : undefined;

  const [timeout, periodic, offline] = await Promise.all([
    timeoutStaleCommands(timeoutMinutes),
    runDuePeriodicSchedules(),
    scanDeviceOfflineAlerts(offlineMinutes),
  ]);

  return jsonOk({
    ok: true,
    timeout,
    periodic,
    offline,
    ranAt: new Date().toISOString(),
  });
}
