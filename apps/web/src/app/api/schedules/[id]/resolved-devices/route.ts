import { getSession } from "@/lib/auth";
import { canManageSchedule } from "@/lib/permissions";
import { jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { resolveDevicesForSchedule } from "@/lib/routing";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canManageSchedule(user)) return jsonError("Forbidden", 403);

  const schedule = await prisma.broadcastSchedule.findUnique({
    where: { id: params.id },
    include: {
      campaign: { include: { org: true } },
      targets: { include: { cluster: { select: { id: true, name: true, code: true } } } },
    },
  });
  if (!schedule) return jsonError("Not found", 404);
  if (!schedule.campaign.org.path.startsWith(user.orgPath)) {
    return jsonError("Forbidden", 403);
  }

  const devices = await resolveDevicesForSchedule(params.id);
  return jsonOk({
    scheduleId: params.id,
    targets: schedule.targets,
    count: devices.length,
    devices,
  });
}
