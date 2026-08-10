import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canManageSchedule } from "@/lib/permissions";
import { jsonError, jsonOk } from "@/lib/api";
import { CampaignType } from "@prisma/client";

function parseTimeToMinutes(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) {
    const n = Math.floor(v);
    if (n < 0 || n > 1439) return null;
    return n;
  }
  if (typeof v === "string") {
    const m = v.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h > 23 || min > 59) return null;
    return h * 60 + min;
  }
  return null;
}

export async function GET() {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canManageSchedule(user)) return jsonError("Forbidden", 403);

  const schedules = await prisma.broadcastSchedule.findMany({
    include: {
      campaign: true,
      items: { include: { content: true, mediaAsset: true } },
      targets: { include: { cluster: true } },
    },
    orderBy: { startAt: "desc" },
  });
  return jsonOk({ schedules });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canManageSchedule(user)) return jsonError("Forbidden", 403);

  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.contentId || !body?.clusterId) {
    return jsonError("Thiếu name / contentId / clusterId");
  }

  const content = await prisma.content.findUnique({
    where: { id: body.contentId },
    include: { mediaAsset: true },
  });
  if (!content || content.status !== "ready_to_air") {
    return jsonError("Content phải ở trạng thái ready_to_air");
  }

  const emergency = Boolean(body.emergency || body.preempt);
  const intervalMinutes =
    !emergency && body.intervalMinutes != null && Number(body.intervalMinutes) > 0
      ? Number(body.intervalMinutes)
      : null;

  let type: CampaignType = CampaignType.oneshot;
  if (emergency) type = CampaignType.emergency;
  else if (intervalMinutes) type = CampaignType.periodic;

  const startAt = body.startAt ? new Date(body.startAt) : new Date();
  const endAt = body.endAt ? new Date(body.endAt) : null;
  const windowStartMin = parseTimeToMinutes(body.windowStart ?? body.windowStartMin);
  const windowEndMin = parseTimeToMinutes(body.windowEnd ?? body.windowEndMin);

  if ((windowStartMin == null) !== (windowEndMin == null)) {
    return jsonError("Cần cả windowStart và windowEnd (HH:MM) hoặc để trống");
  }

  const campaign = await prisma.campaign.create({
    data: {
      orgId: user.orgId,
      name: `Campaign — ${body.name}`,
      type,
    },
  });

  const schedule = await prisma.broadcastSchedule.create({
    data: {
      campaignId: campaign.id,
      name: body.name,
      startAt,
      intervalMinutes,
      nextRunAt: intervalMinutes ? startAt : null,
      endAt,
      windowStartMin,
      windowEndMin,
      preempt: emergency || Boolean(body.preempt),
      createdById: user.id,
      status: "scheduled",
      items: {
        create: [
          {
            contentId: content.id,
            mediaAssetId: content.mediaAssetId,
            sortOrder: 1,
          },
        ],
      },
      targets: {
        create: [{ clusterId: body.clusterId, include: true }],
      },
    },
    include: {
      campaign: true,
      items: true,
      targets: { include: { cluster: true } },
    },
  });

  return jsonOk({ schedule }, { status: 201 });
}
