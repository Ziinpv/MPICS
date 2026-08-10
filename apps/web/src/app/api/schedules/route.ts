import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canManageSchedule } from "@/lib/permissions";
import { jsonError, jsonOk } from "@/lib/api";
import { CampaignType } from "@prisma/client";

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

  const intervalMinutes =
    body.intervalMinutes != null && Number(body.intervalMinutes) > 0
      ? Number(body.intervalMinutes)
      : null;
  const type: CampaignType = intervalMinutes ? CampaignType.periodic : CampaignType.oneshot;
  const startAt = body.startAt ? new Date(body.startAt) : new Date();
  const endAt = body.endAt ? new Date(body.endAt) : null;

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
