import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { IncidentStatus, UserRole } from "@prisma/client";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rateLimit";
import { normalizeStorageKey } from "@/lib/storage";

type Ctx = { params: { id: string } };

const TRANSITIONS: Record<string, IncidentStatus[]> = {
  open: ["assigned", "in_progress", "resolved", "closed"],
  assigned: ["in_progress", "resolved", "closed", "open"],
  in_progress: ["resolved", "closed", "assigned"],
  resolved: ["closed", "in_progress"],
  closed: [],
};

export async function GET(_req: NextRequest, { params }: Ctx) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);

  const incident = await prisma.incidentReport.findUnique({
    where: { id: params.id },
    include: {
      device: true,
      reporter: { select: { fullName: true } },
      assignee: { select: { fullName: true } },
      org: { select: { path: true, name: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { fullName: true } } },
      },
    },
  });
  if (!incident) return jsonError("Not found", 404);
  if (user.role === UserRole.USER && incident.orgId !== user.orgId) {
    return jsonError("Forbidden", 403);
  }
  if (user.role === UserRole.ADMIN && !incident.org.path.startsWith(user.orgPath)) {
    return jsonError("Forbidden", 403);
  }
  return jsonOk({ incident });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (user.role !== UserRole.ADMIN) return jsonError("Forbidden", 403);

  const existing = await prisma.incidentReport.findUnique({
    where: { id: params.id },
    include: {
      org: { select: { path: true, name: true } },
      reporter: { select: { fullName: true, email: true } },
      device: { select: { name: true, deviceCode: true } },
    },
  });
  if (!existing) return jsonError("Not found", 404);
  if (!existing.org.path.startsWith(user.orgPath)) return jsonError("Forbidden", 403);

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  const prevStatus = existing.status;

  if (body.status != null) {
    const next = body.status as IncidentStatus;
    const allowed = TRANSITIONS[existing.status] || [];
    if (!allowed.includes(next)) {
      return jsonError(`Không chuyển ${existing.status} → ${next}`);
    }
    data.status = next;
    if (next === "resolved" || next === "closed") {
      data.resolvedAt = new Date();
    }
    if (next === "assigned" || next === "in_progress") {
      data.assigneeId = body.assigneeId || existing.assigneeId || user.id;
    }
  }

  if (body.assigneeId != null) data.assigneeId = body.assigneeId;
  if (Array.isArray(body.photoKeys) && body.photoKeys.length) {
    const keys = body.photoKeys.map((k: string) => normalizeStorageKey(k));
    data.photoKeys = [...new Set([...(existing.photoKeys || []), ...keys])];
  }

  const incident = await prisma.incidentReport.update({
    where: { id: params.id },
    data,
    include: {
      device: true,
      reporter: { select: { fullName: true, email: true } },
      assignee: { select: { fullName: true } },
      comments: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { author: { select: { fullName: true } } },
      },
    },
  });

  if (typeof body.comment === "string" && body.comment.trim()) {
    await prisma.incidentComment.create({
      data: {
        incidentId: params.id,
        authorId: user.id,
        body: body.comment.trim(),
      },
    });
  }

  let notified: { emailed: boolean; reason?: string } = { emailed: false };
  const becameResolved =
    (incident.status === "resolved" || incident.status === "closed") &&
    prevStatus !== "resolved" &&
    prevStatus !== "closed";

  if (becameResolved) {
    const to = incident.reporter?.email?.trim();
    if (!to) {
      notified = { emailed: false, reason: "reporter_no_email" };
    } else {
      try {
        const { sendMail, smtpConfigured } = await import("@/lib/mail");
        if (!smtpConfigured()) {
          notified = { emailed: false, reason: "smtp_not_configured" };
        } else {
          await sendMail({
            to,
            subject: `[MPCIS] Sự cố đã xử lý: ${incident.title}`,
            text: [
              `Xin chào ${incident.reporter?.fullName || ""},`,
              "",
              `Sự cố của bạn đã được cập nhật: ${incident.status}.`,
              `Tiêu đề: ${incident.title}`,
              `Thiết bị: ${incident.device?.name || ""} (${incident.device?.deviceCode || ""})`,
              `Người xử lý: ${user.fullName || user.username}`,
              body.comment?.trim() ? `Ghi chú: ${body.comment.trim()}` : "",
              "",
              "— Hệ thống MPCIS",
            ]
              .filter(Boolean)
              .join("\n"),
          });
          notified = { emailed: true };
        }
      } catch (e: any) {
        console.error("[incident] notify", e);
        notified = { emailed: false, reason: e?.message || "mail_error" };
      }
    }
  }

  await writeAuditLog({
    actor: user,
    action: "incident.update",
    entityType: "IncidentReport",
    entityId: params.id,
    meta: { status: incident.status, assigneeId: incident.assigneeId, notified },
    ip: clientIp(req),
  });

  return jsonOk({ incident, notified });
}
