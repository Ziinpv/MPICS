import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { UserRole } from "@prisma/client";

type Ctx = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (user.role !== UserRole.ADMIN) return jsonError("Forbidden", 403);

  const body = await req.json().catch(() => ({}));
  const status = body.status as string | undefined;

  const incident = await prisma.incidentReport.update({
    where: { id: params.id },
    data: {
      status: status as never,
      resolvedAt: status === "resolved" || status === "closed" ? new Date() : undefined,
      assigneeId: body.assigneeId ?? user.id,
    },
  });
  return jsonOk({ incident });
}
