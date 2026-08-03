import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);

  const province = await prisma.organization.findFirst({
    where: { type: "province", code: "68" },
  });

  const orgs = await prisma.organization.findMany({
    where: province
      ? {
          OR: [{ id: province.id }, { parentId: province.id }],
        }
      : { path: { startsWith: "/lam_dong" } },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  const clusters = await prisma.deviceCluster.findMany({
    include: { org: true },
    orderBy: { name: "asc" },
  });

  return jsonOk({
    orgs,
    clusters,
    province,
    communeCount: orgs.filter((o) => o.type === "commune").length,
  });
}
