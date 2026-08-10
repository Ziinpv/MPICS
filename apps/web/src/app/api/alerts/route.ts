import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { UserRole } from "@prisma/client";

/** GET device alerts for IoT dashboard */
export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (user.role !== UserRole.ADMIN) return jsonError("Forbidden", 403);

  const status = req.nextUrl.searchParams.get("status") || "open";
  const where =
    status === "all"
      ? { device: { org: { path: { startsWith: user.orgPath } } } }
      : {
          status: status as "open" | "acked" | "resolved",
          device: { org: { path: { startsWith: user.orgPath } } },
        };

  const alerts = await prisma.deviceAlert.findMany({
    where,
    include: {
      device: { select: { id: true, name: true, deviceCode: true, online: true, lastSeenAt: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const openCount = await prisma.deviceAlert.count({
    where: {
      status: "open",
      device: { org: { path: { startsWith: user.orgPath } } },
    },
  });

  return jsonOk({ alerts, openCount });
}
