import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canUpdateLocation } from "@/lib/permissions";
import { jsonError, jsonOk } from "@/lib/api";
import { UserRole } from "@prisma/client";
import { LOCATION_TYPE_LABELS } from "@/lib/labels";

const VALID_LOCATION_TYPES = new Set(Object.keys(LOCATION_TYPE_LABELS));

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);

  const location = await prisma.location.findUnique({
    where: { id: params.id },
    include: { media: true, org: true, createdBy: { select: { fullName: true } } },
  });
  if (!location) return jsonError("Not found", 404);
  if (user.role === UserRole.USER && location.orgId !== user.orgId) {
    return jsonError("Forbidden", 403);
  }
  return jsonOk({
    location,
    locationTypeLabel: LOCATION_TYPE_LABELS[location.locationType],
  });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canUpdateLocation(user)) return jsonError("Forbidden", 403);

  const existing = await prisma.location.findUnique({ where: { id: params.id } });
  if (!existing) return jsonError("Not found", 404);
  if (user.role === UserRole.USER && existing.orgId !== user.orgId) {
    return jsonError("Forbidden", 403);
  }

  const body = await req.json().catch(() => ({}));
  if (body.locationType && !VALID_LOCATION_TYPES.has(body.locationType)) {
    return jsonError(
      `locationType không hợp lệ. Hỗ trợ: ${Array.from(VALID_LOCATION_TYPES).join(", ")}`,
    );
  }

  const location = await prisma.location.update({
    where: { id: params.id },
    data: {
      name: body.name ?? undefined,
      locationType: body.locationType ?? undefined,
      locationSubtype: body.locationSubtype ?? undefined,
      address: body.address ?? undefined,
      lat: body.lat != null ? Number(body.lat) : undefined,
      lng: body.lng != null ? Number(body.lng) : undefined,
      licenseNumber: body.licenseNumber ?? undefined,
      licenseConditions: body.licenseConditions ?? undefined,
      licenseDate: body.licenseDate ? new Date(body.licenseDate) : undefined,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
      operationStatus: body.operationStatus ?? undefined,
      note: body.note ?? undefined,
    },
    include: { media: true, org: true },
  });
  return jsonOk({
    location,
    locationTypeLabel: LOCATION_TYPE_LABELS[location.locationType],
  });
}
