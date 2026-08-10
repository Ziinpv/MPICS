import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canCreateContent } from "@/lib/permissions";
import { jsonError, jsonOk } from "@/lib/api";
import { ContentCategory, UserRole } from "@prisma/client";

export async function GET() {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (user.role !== UserRole.ADMIN) return jsonError("Forbidden — chỉ Admin", 403);

  const contents = await prisma.content.findMany({
    where: { org: { path: { startsWith: user.orgPath } } },
    include: {
      author: { select: { fullName: true } },
      reviewedBy: { select: { fullName: true } },
      mediaAsset: true,
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { reviewer: { select: { fullName: true } } },
      },
      ttsJobs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          driver: true,
          voice: true,
          error: true,
          finishedAt: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return jsonOk({ contents });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canCreateContent(user)) return jsonError("Forbidden — User không được tạo content", 403);

  const body = await req.json().catch(() => null);
  if (!body?.title || !body?.bodyPlain) return jsonError("Thiếu title/bodyPlain");

  const content = await prisma.content.create({
    data: {
      title: body.title,
      bodyPlain: body.bodyPlain,
      category: (body.category as ContentCategory) || "other",
      status: "draft",
      orgId: user.orgId,
      authorId: user.id,
    },
  });
  return jsonOk({ content }, { status: 201 });
}
