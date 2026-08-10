import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canModerateContent } from "@/lib/permissions";
import { jsonError, jsonOk } from "@/lib/api";
import { enqueueAndRunTts } from "@/lib/tts";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rateLimit";

type Ctx = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canModerateContent(user)) return jsonError("Forbidden", 403);

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;
  const content = await prisma.content.findUnique({ where: { id: params.id } });
  if (!content) return jsonError("Not found", 404);

  if (action === "approve") {
    if (!["draft", "pending", "approved"].includes(content.status)) {
      return jsonError(`Không duyệt được ở trạng thái ${content.status}`);
    }

    await prisma.content.update({
      where: { id: params.id },
      data: { status: "tts_processing" },
    });

    try {
      const { job, sync } = await enqueueAndRunTts(params.id, {
        voice: body.voice,
        sync: body.async !== true,
      });
      const updated = await prisma.content.findUnique({
        where: { id: params.id },
        include: { mediaAsset: true },
      });

      await writeAuditLog({
        actor: user,
        action: "content.approve_tts",
        entityType: "Content",
        entityId: params.id,
        meta: { jobId: job.id, status: job.status, sync, driver: job.driver },
        ip: clientIp(req),
      });

      return jsonOk({
        content: updated,
        ttsJob: job,
        sync,
        message:
          job.status === "done"
            ? "Đã duyệt + TTS xong → ready_to_air"
            : job.status === "failed"
              ? `TTS lỗi: ${job.error}`
              : "Đã enqueue TTS (chạy npm run tts:worker)",
      });
    } catch (e: any) {
      return jsonError(e?.message || "TTS thất bại", 500);
    }
  }

  if (action === "reject") {
    const updated = await prisma.content.update({
      where: { id: params.id },
      data: { status: "rejected" },
    });
    return jsonOk({ content: updated });
  }

  if (action === "retry_tts") {
    if (!["approved", "tts_processing", "ready_to_air"].includes(content.status)) {
      return jsonError("Chỉ retry TTS khi đã duyệt / processing");
    }
    try {
      const { job } = await enqueueAndRunTts(params.id, { voice: body.voice, sync: true });
      const updated = await prisma.content.findUnique({
        where: { id: params.id },
        include: { mediaAsset: true },
      });
      return jsonOk({ content: updated, ttsJob: job });
    } catch (e: any) {
      return jsonError(e?.message || "Retry TTS thất bại", 500);
    }
  }

  return jsonError("action phải là approve|reject|retry_tts");
}
