import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { canManageSchedule } from "@/lib/permissions";
import { jsonError, jsonOk } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rateLimit";
import { publishScheduleCommands } from "@/lib/scheduleJobs";

type Ctx = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canManageSchedule(user)) return jsonError("Forbidden", 403);

  try {
    const result = await publishScheduleCommands({
      scheduleId: params.id,
      issuedById: user.id,
    });

    await writeAuditLog({
      actor: user,
      action: "schedule.publish",
      entityType: "BroadcastSchedule",
      entityId: params.id,
      meta: {
        commandsCreated: result.commandsCreated,
        isPeriodic: result.isPeriodic,
        nextRunAt: result.nextRunAt,
      },
      ip: clientIp(req),
    });

    return jsonOk({
      scheduleId: params.id,
      commandsCreated: result.commandsCreated,
      commands: result.commands,
      isPeriodic: result.isPeriodic,
      nextRunAt: result.nextRunAt,
    });
  } catch (err: any) {
    if (String(err?.message).includes("not found")) return jsonError("Not found", 404);
    return jsonError(err?.message || "Publish lỗi", 500);
  }
}
