import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { UserRole } from "@prisma/client";
import {
  DEVICE_TYPE_LABELS,
  DEVICE_TYPE_OPTIONS,
  LOCATION_SUBTYPES_BY_TYPE,
  LOCATION_TYPE_LABELS,
  LOCATION_TYPE_OPTIONS,
} from "@/lib/labels";
import { COMMUNE_BBOX_BY_KEY, LAM_DONG_BBOX, isGeoValidationEnabled, resolveOrgBbox, resolveCommuneBboxKey } from "@/lib/communeBbox";
import { orgWhereForUser } from "@/lib/permissions";

export async function GET() {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);

  let orgs: Awaited<ReturnType<typeof prisma.organization.findMany>>;

  if (user.role === UserRole.USER) {
    const mine = await prisma.organization.findUnique({
      where: { id: user.orgId },
      include: { parent: true },
    });
    orgs = [];
    if (mine?.parent) orgs.push(mine.parent);
    if (mine) orgs.push(mine);
  } else {
    orgs = await prisma.organization.findMany({
      where: orgWhereForUser(user),
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
  }

  const province =
    orgs.find((o) => o.type === "province") ||
    (await prisma.organization.findFirst({
      where: { type: "province", path: { startsWith: user.orgPath.split("/").slice(0, 2).join("/") || user.orgPath } },
    }));

  const clusters = await prisma.deviceCluster.findMany({
    where:
      user.role === UserRole.USER
        ? { orgId: user.orgId }
        : { org: { path: { startsWith: user.orgPath } } },
    include: { org: true },
    orderBy: { name: "asc" },
  });

  const typeDefs = await prisma.locationTypeDef.findMany({
    where: { active: true },
    orderBy: [{ groupType: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  const locationSubtypesByType: Record<string, { value: string; label: string }[]> = {
    ...LOCATION_SUBTYPES_BY_TYPE,
  };
  if (typeDefs.length) {
    const fromDb: Record<string, { value: string; label: string }[]> = {};
    for (const t of typeDefs) {
      if (!fromDb[t.groupType]) fromDb[t.groupType] = [];
      fromDb[t.groupType].push({ value: t.code, label: t.name });
    }
    Object.assign(locationSubtypesByType, fromDb);
  }

  const myOrg = orgs.find((o) => o.id === user.orgId) || orgs.find((o) => o.type === "commune");
  const myBbox = myOrg ? resolveOrgBbox(myOrg) : null;
  const myBboxKey = myOrg ? resolveCommuneBboxKey(myOrg) || "mine" : "mine";

  return jsonOk({
    orgs,
    clusters,
    province: province || null,
    myOrg: myOrg || null,
    communeCount: orgs.filter((o) => o.type === "commune").length,
    locationTypes: LOCATION_TYPE_OPTIONS,
    locationTypeLabels: LOCATION_TYPE_LABELS,
    locationSubtypesByType,
    deviceTypes: DEVICE_TYPE_OPTIONS,
    deviceTypeLabels: DEVICE_TYPE_LABELS,
    geoValidation: {
      enabled: isGeoValidationEnabled(),
      lamDongBbox: LAM_DONG_BBOX,
      communeBboxes:
        user.role === UserRole.USER && myBbox
          ? { [myBboxKey]: myBbox.bbox }
          : COMMUNE_BBOX_BY_KEY,
      myBbox: myBbox
        ? {
            ...myBbox.bbox,
            label: myBbox.label,
            centerLat: (myBbox.bbox.minLat + myBbox.bbox.maxLat) / 2,
            centerLng: (myBbox.bbox.minLng + myBbox.bbox.maxLng) / 2,
          }
        : null,
    },
  });
}
