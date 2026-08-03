import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { UserRole } from "@prisma/client";

export async function GET(_req: NextRequest) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);

  const where =
    user.role === UserRole.USER
      ? { orgId: user.orgId }
      : { org: { path: { startsWith: user.orgPath } } };

  const devices = await prisma.device.findMany({
    where,
    include: { cluster: true, org: true },
    orderBy: { name: "asc" },
  });
  return jsonOk({ devices });
}
