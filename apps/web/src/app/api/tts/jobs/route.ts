import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canModerateContent } from "@/lib/permissions";
import { jsonError, jsonOk } from "@/lib/api";
import { enqueueAndRunTts } from "@/lib/tts";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rateLimit";

/** POST /api/tts/jobs — enqueue TTS cho content đã approved */
export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canModerateContent(user)) return jsonError("Forbidden", 403);

  const body = await req.json().catch(() => null);
  const contentId = body?.contentId || body?.content_id;
  if (!contentId) return jsonError("Thiếu contentId");

  const content = await prisma.content.findUnique({ where: { id: contentId } });
  if (!content) return jsonError("Content not found", 404);
  if (!["approved", "tts_processing", "ready_to_air"].includes(content.status)) {
    return jsonError("Content phải ở approved (hoặc retry từ ready_to_air)");
  }

  try {
    await prisma.content.update({
      where: { id: contentId },
      data: { status: "tts_processing" },
    });
    const { job, sync } = await enqueueAndRunTts(contentId, {
      voice: body.voice,
      voiceGender: body.voiceGender || body.voice_gender,
      region: body.region,
      speed: body.speed != null ? Number(body.speed) : undefined,
      sync: body.async !== true,
    });

    await writeAuditLog({
      actor: user,
      action: "tts.job.create",
      entityType: "TtsJob",
      entityId: job.id,
      meta: {
        contentId,
        status: job.status,
        voice: job.voice,
        speed: job.speed,
        sync,
      },
      ip: clientIp(req),
    });

    return jsonOk(
      {
        job,
        sync,
        message:
          job.status === "done"
            ? "TTS xong → ready_to_air"
            : job.status === "failed"
              ? `TTS lỗi: ${job.error}`
              : "Đã enqueue TTS",
      },
      { status: 201 },
    );
  } catch (e: any) {
    return jsonError(e?.message || "TTS thất bại", 500);
  }
}

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canModerateContent(user)) return jsonError("Forbidden", 403);

  const contentId = new URL(req.url).searchParams.get("content_id");
  const jobs = await prisma.ttsJob.findMany({
    where: contentId ? { contentId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      content: { select: { id: true, title: true, status: true } },
      mediaAsset: { select: { id: true, storageKey: true, durationSec: true } },
    },
  });
  return jsonOk({ jobs });
}
