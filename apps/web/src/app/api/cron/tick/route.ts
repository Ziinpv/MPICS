import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { runDuePeriodicSchedules, timeoutStaleCommands } from "@/lib/scheduleJobs";
import { UserRole } from "@prisma/client";

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const header = req.headers.get("x-cron-secret") || "";
  if (secret && header === secret) return true;
  return false;
}

/** Cron tick: timeout lệnh + chạy lịch periodic đến hạn */
export async function POST(req: NextRequest) {
  const session = await getSession();
  const okCron = authorized(req);
  if (!okCron && (!session || session.role !== UserRole.ADMIN)) {
    return jsonError("Forbidden", 403);
  }

  const body = await req.json().catch(() => ({}));
  const timeoutMinutes = body.timeoutMinutes != null ? Number(body.timeoutMinutes) : undefined;

  const [timeout, periodic] = await Promise.all([
    timeoutStaleCommands(timeoutMinutes),
    runDuePeriodicSchedules(),
  ]);

  return jsonOk({
    ok: true,
    timeout,
    periodic,
    ranAt: new Date().toISOString(),
  });
}
