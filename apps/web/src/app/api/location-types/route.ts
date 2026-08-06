import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canManageLocationTypes } from "@/lib/permissions";
import { jsonError, jsonOk } from "@/lib/api";
import { LocationType } from "@prisma/client";
import { LOCATION_TYPE_LABELS } from "@/lib/labels";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rateLimit";

const VALID_GROUPS = new Set(Object.keys(LOCATION_TYPE_LABELS));

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);

  const groupType = new URL(req.url).searchParams.get("group_type") as LocationType | null;
  const activeOnly = new URL(req.url).searchParams.get("active") !== "0";

  const items = await prisma.locationTypeDef.findMany({
    where: {
      ...(groupType ? { groupType } : {}),
      ...(activeOnly ? { active: true } : {}),
    },
    orderBy: [{ groupType: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  const byGroup: Record<string, { value: string; label: string; id: string }[]> = {};
  for (const item of items) {
    if (!byGroup[item.groupType]) byGroup[item.groupType] = [];
    byGroup[item.groupType].push({ value: item.code, label: item.name, id: item.id });
  }

  return jsonOk({
    items,
    byGroup,
    groupLabels: LOCATION_TYPE_LABELS,
  });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canManageLocationTypes(user)) return jsonError("Forbidden", 403);

  const body = await req.json().catch(() => null);
  if (!body?.name?.trim() || !body?.groupType) {
    return jsonError("Thiếu name / groupType");
  }
  if (!VALID_GROUPS.has(body.groupType)) {
    return jsonError(`groupType không hợp lệ. Hỗ trợ: ${Array.from(VALID_GROUPS).join(", ")}`);
  }

  const code = (body.code?.trim() || slugify(body.name)).replace(/\s+/g, "_");
  if (!code) return jsonError("Code không hợp lệ");

  const exists = await prisma.locationTypeDef.findUnique({
    where: { groupType_code: { groupType: body.groupType, code } },
  });
  if (exists) return jsonError("Code đã tồn tại trong nhóm này", 409);

  const maxSort = await prisma.locationTypeDef.aggregate({
    where: { groupType: body.groupType },
    _max: { sortOrder: true },
  });

  const item = await prisma.locationTypeDef.create({
    data: {
      groupType: body.groupType as LocationType,
      code,
      name: body.name.trim(),
      active: body.active !== false,
      sortOrder: body.sortOrder ?? (maxSort._max.sortOrder || 0) + 1,
    },
  });

  await writeAuditLog({
    actor: user,
    action: "location_type.create",
    entityType: "LocationTypeDef",
    entityId: item.id,
    meta: { groupType: item.groupType, code: item.code, name: item.name },
    ip: clientIp(req),
  });

  return jsonOk({ item }, { status: 201 });
}
