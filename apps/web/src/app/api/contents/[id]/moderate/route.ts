import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canModerateContent } from "@/lib/permissions";
import { jsonError, jsonOk } from "@/lib/api";

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
    const media = await prisma.mediaAsset.create({
      data: {
        storageKey: `mock/${params.id}.mp3`,
        cdnUrl: `https://example.com/mock/${params.id}.mp3`,
        durationSec: Math.max(30, Math.round(content.bodyPlain.length / 12)),
        signature: `sig-${params.id}`,
        checksum: `sum-${params.id}`,
      },
    });
    const updated = await prisma.content.update({
      where: { id: params.id },
      data: { status: "ready_to_air", mediaAssetId: media.id },
      include: { mediaAsset: true },
    });
    return jsonOk({ content: updated });
  }

  if (action === "reject") {
    const updated = await prisma.content.update({
      where: { id: params.id },
      data: { status: "rejected" },
    });
    return jsonOk({ content: updated });
  }

  return jsonError("action phải là approve|reject");
}
