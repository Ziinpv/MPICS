import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canModerateContent } from "@/lib/permissions";
import { jsonError, jsonOk } from "@/lib/api";
import { enqueueAndRunTts } from "@/lib/tts";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rateLimit";

type Ctx = { params: { id: string } };

async function recordReview(input: {
  contentId: string;
  reviewerId: string;
  action: "submit" | "approve" | "reject" | "request_revision";
  reason?: string | null;
}) {
  return prisma.moderationReview.create({
    data: {
      contentId: input.contentId,
      reviewerId: input.reviewerId,
      action: input.action,
      reason: input.reason || null,
    },
  });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canModerateContent(user)) return jsonError("Forbidden", 403);

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;
  const content = await prisma.content.findUnique({ where: { id: params.id } });
  if (!content) return jsonError("Not found", 404);

  if (action === "submit") {
    if (!["draft", "rejected"].includes(content.status)) {
      return jsonError(`Chỉ submit từ draft/rejected (hiện: ${content.status})`);
    }
    const updated = await prisma.content.update({
      where: { id: params.id },
      data: {
        status: "pending",
        rejectionReason: null,
        reviewedById: null,
        reviewedAt: null,
      },
      include: {
        reviewedBy: { select: { fullName: true } },
        reviews: { orderBy: { createdAt: "desc" }, take: 5, include: { reviewer: { select: { fullName: true } } } },
      },
    });
    await recordReview({ contentId: params.id, reviewerId: user.id, action: "submit" });
    await writeAuditLog({
      actor: user,
      action: "content.submit",
      entityType: "Content",
      entityId: params.id,
      ip: clientIp(req),
    });
    return jsonOk({ content: updated, message: "Đã gửi chờ duyệt" });
  }

  if (action === "approve") {
    if (!["draft", "pending"].includes(content.status)) {
      return jsonError(`Không duyệt được ở trạng thái ${content.status}`);
    }

    const updated = await prisma.content.update({
      where: { id: params.id },
      data: {
        status: "approved",
        rejectionReason: null,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
      include: {
        reviewedBy: { select: { fullName: true } },
        mediaAsset: true,
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { reviewer: { select: { fullName: true } } },
        },
      },
    });

    await recordReview({ contentId: params.id, reviewerId: user.id, action: "approve" });
    await writeAuditLog({
      actor: user,
      action: "content.approve",
      entityType: "Content",
      entityId: params.id,
      ip: clientIp(req),
    });

    return jsonOk({
      content: updated,
      message: "Đã duyệt nội dung → approved (chạy TTS riêng)",
    });
  }

  if (action === "reject") {
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!reason) return jsonError("Bắt buộc lý do từ chối (reason)");
    if (!["draft", "pending", "approved"].includes(content.status)) {
      return jsonError(`Không từ chối ở trạng thái ${content.status}`);
    }

    const updated = await prisma.content.update({
      where: { id: params.id },
      data: {
        status: "rejected",
        rejectionReason: reason,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
      include: {
        reviewedBy: { select: { fullName: true } },
        reviews: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { reviewer: { select: { fullName: true } } },
        },
      },
    });

    await recordReview({
      contentId: params.id,
      reviewerId: user.id,
      action: "reject",
      reason,
    });
    await writeAuditLog({
      actor: user,
      action: "content.reject",
      entityType: "Content",
      entityId: params.id,
      meta: { reason },
      ip: clientIp(req),
    });

    return jsonOk({ content: updated, message: "Đã từ chối" });
  }

  if (action === "run_tts" || action === "retry_tts") {
    const allowed =
      action === "run_tts"
        ? ["approved", "tts_processing"]
        : ["approved", "tts_processing", "ready_to_air"];
    if (!allowed.includes(content.status)) {
      return jsonError(
        action === "run_tts"
          ? "Chỉ chạy TTS khi đã approved (duyệt nội dung trước)"
          : "Không retry TTS ở trạng thái này",
      );
    }

    try {
      await prisma.content.update({
        where: { id: params.id },
        data: { status: "tts_processing" },
      });
      const { job, sync } = await enqueueAndRunTts(params.id, {
        voice: body.voice,
        sync: body.async !== true,
      });
      const updated = await prisma.content.findUnique({
        where: { id: params.id },
        include: {
          mediaAsset: true,
          reviewedBy: { select: { fullName: true } },
          ttsJobs: { orderBy: { createdAt: "desc" }, take: 1 },
          reviews: {
            orderBy: { createdAt: "desc" },
            take: 5,
            include: { reviewer: { select: { fullName: true } } },
          },
        },
      });

      await writeAuditLog({
        actor: user,
        action: action === "run_tts" ? "content.run_tts" : "content.retry_tts",
        entityType: "Content",
        entityId: params.id,
        meta: { jobId: job.id, status: job.status, sync, driver: job.driver, voice: job.voice },
        ip: clientIp(req),
      });

      return jsonOk({
        content: updated,
        ttsJob: job,
        sync,
        message:
          job.status === "done"
            ? action === "run_tts"
              ? "TTS xong → ready_to_air"
              : "Retry TTS OK → ready_to_air"
            : job.status === "failed"
              ? `TTS lỗi: ${job.error}`
              : "Đã enqueue TTS (chạy npm run tts:worker)",
      });
    } catch (e: any) {
      return jsonError(e?.message || "TTS thất bại", 500);
    }
  }

  return jsonError("action phải là submit|approve|reject|run_tts|retry_tts");
}
