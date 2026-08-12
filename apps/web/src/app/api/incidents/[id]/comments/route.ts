import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { UserRole } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rateLimit";

type Ctx = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);

  const incident = await prisma.incidentReport.findUnique({
    where: { id: params.id },
    include: { org: { select: { path: true } } },
  });
  if (!incident) return jsonError("Not found", 404);

  if (user.role === UserRole.USER && incident.orgId !== user.orgId) {
    return jsonError("Forbidden", 403);
  }
  if (user.role === UserRole.ADMIN && !incident.org.path.startsWith(user.orgPath)) {
    return jsonError("Forbidden", 403);
  }

  const body = await req.json().catch(() => null);
  const text = typeof body?.body === "string" ? body.body.trim() : "";
  if (!text) return jsonError("Thiếu nội dung comment");

  const comment = await prisma.incidentComment.create({
    data: {
      incidentId: params.id,
      authorId: user.id,
      body: text,
    },
    include: { author: { select: { fullName: true } } },
  });

  await writeAuditLog({
    actor: user,
    action: "incident.comment",
    entityType: "IncidentReport",
    entityId: params.id,
    ip: clientIp(req),
  });

  return jsonOk({ comment }, { status: 201 });
}
