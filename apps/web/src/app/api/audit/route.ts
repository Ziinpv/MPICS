import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { UserRole } from "@prisma/client";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (user.role !== UserRole.ADMIN) return jsonError("Forbidden", 403);

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action")?.trim() || "";
  const q = searchParams.get("q")?.trim() || "";
  const take = Math.min(Number(searchParams.get("limit") || 100), 200);

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(action ? { action: { contains: action } } : {}),
      ...(q
        ? {
            OR: [
              { actorUsername: { contains: q, mode: "insensitive" } },
              { entityId: { contains: q } },
              { action: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  return jsonOk({ logs, count: logs.length });
}
