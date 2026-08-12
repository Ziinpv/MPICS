import { getSession } from "@/lib/auth";
import { canModerateContent } from "@/lib/permissions";
import { jsonError, jsonOk } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { enqueueAndRunTts, processTtsJob } from "@/lib/tts";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rateLimit";
import { NextRequest } from "next/server";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canModerateContent(user)) return jsonError("Forbidden", 403);

  const job = await prisma.ttsJob.findUnique({
    where: { id: params.id },
    include: {
      content: { select: { id: true, title: true, status: true } },
      mediaAsset: true,
    },
  });
  if (!job) return jsonError("Not found", 404);
  return jsonOk({ job });
}

/** POST retry job */
export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canModerateContent(user)) return jsonError("Forbidden", 403);

  const existing = await prisma.ttsJob.findUnique({ where: { id: params.id } });
  if (!existing) return jsonError("Not found", 404);

  const body = await req.json().catch(() => ({}));
  try {
    const { job, sync } = await enqueueAndRunTts(existing.contentId, {
      voice: body.voice || existing.voice,
      voiceGender: body.voiceGender || existing.voiceGender,
      region: body.region || existing.region,
      speed: body.speed != null ? Number(body.speed) : existing.speed,
      sync: body.async !== true,
    });

    await writeAuditLog({
      actor: user,
      action: "tts.job.retry",
      entityType: "TtsJob",
      entityId: job.id,
      meta: { fromJobId: params.id, status: job.status, sync },
      ip: clientIp(req),
    });

    return jsonOk({ job, sync });
  } catch (e: any) {
    // Nếu sync fail mid-flight, thử process lại job cũ queued
    try {
      const job = await processTtsJob(params.id);
      return jsonOk({ job, sync: true });
    } catch {
      return jsonError(e?.message || "Retry TTS thất bại", 500);
    }
  }
}
