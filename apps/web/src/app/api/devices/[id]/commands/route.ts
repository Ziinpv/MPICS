import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canControlDevice } from "@/lib/permissions";
import { jsonError, jsonOk } from "@/lib/api";
import { CommandType } from "@prisma/client";

type Ctx = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canControlDevice(user)) return jsonError("Forbidden", 403);

  const device = await prisma.device.findUnique({ where: { id: params.id } });
  if (!device) return jsonError("Device not found", 404);

  const body = await req.json().catch(() => ({}));
  const commandType = (body.commandType || "reboot") as CommandType;

  const command = await prisma.deviceCommand.create({
    data: {
      deviceId: device.id,
      commandType,
      payload: body.payload ?? {},
      issuedById: user.id,
      status: "pending",
    },
  });

  return jsonOk({ command }, { status: 201 });
}
