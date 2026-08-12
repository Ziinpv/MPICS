import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canControlDevice } from "@/lib/permissions";
import { jsonError, jsonOk } from "@/lib/api";
import { CommandType } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rateLimit";

type Ctx = { params: { id: string } };

const ALLOWED: CommandType[] = [
  "set_volume",
  "reboot",
  "power_on",
  "power_off",
  "stop",
];

export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canControlDevice(user)) return jsonError("Forbidden", 403);

  const cluster = await prisma.deviceCluster.findFirst({
    where: { id: params.id, org: { path: { startsWith: user.orgPath } } },
  });
  if (!cluster) return jsonError("Cluster not found", 404);

  const body = await req.json().catch(() => ({}));
  const commandType = (body.commandType || "reboot") as CommandType;
  if (!ALLOWED.includes(commandType)) {
    return jsonError(`commandType phải là ${ALLOWED.join("|")}`);
  }

  const devices = await prisma.device.findMany({
    where: { clusterId: cluster.id, status: "active" },
    select: { id: true, deviceCode: true },
  });

  const commands = await Promise.all(
    devices.map((d) =>
      prisma.deviceCommand.create({
        data: {
          deviceId: d.id,
          commandType,
          payload: body.payload ?? {},
          issuedById: user.id,
          status: "pending",
        },
      }),
    ),
  );

  await writeAuditLog({
    actor: user,
    action: "cluster.command",
    entityType: "DeviceCluster",
    entityId: cluster.id,
    meta: { commandType, commandsCreated: commands.length },
    ip: clientIp(req),
  });

  return jsonOk(
    {
      clusterId: cluster.id,
      commandType,
      commandsCreated: commands.length,
      commands,
    },
    { status: 201 },
  );
}
