import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import {
  DEVICE_TYPE_LABELS,
  DEVICE_TYPE_OPTIONS,
  LOCATION_SUBTYPES_BY_TYPE,
  LOCATION_TYPE_LABELS,
  LOCATION_TYPE_OPTIONS,
} from "@/lib/labels";
import { COMMUNE_BBOX_BY_KEY, LAM_DONG_BBOX, isGeoValidationEnabled } from "@/lib/communeBbox";

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

  return jsonOk({
    orgs,
    clusters,
    province,
    communeCount: orgs.filter((o) => o.type === "commune").length,
    locationTypes: LOCATION_TYPE_OPTIONS,
    locationTypeLabels: LOCATION_TYPE_LABELS,
    locationSubtypesByType,
    deviceTypes: DEVICE_TYPE_OPTIONS,
    deviceTypeLabels: DEVICE_TYPE_LABELS,
    geoValidation: {
      enabled: isGeoValidationEnabled(),
      lamDongBbox: LAM_DONG_BBOX,
      communeBboxes: COMMUNE_BBOX_BY_KEY,
    },
  });
}
