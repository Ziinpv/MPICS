import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canUpdateLocation } from "@/lib/permissions";
import { jsonError, jsonOk } from "@/lib/api";
import { UserRole } from "@prisma/client";
import { LOCATION_TYPE_LABELS } from "@/lib/labels";
import { normalizeStorageKey } from "@/lib/storage";
import { writeAuditLog } from "@/lib/audit";
import { clientIp } from "@/lib/rateLimit";
import { checkLatLngForOrg, isGeoValidationEnabled } from "@/lib/communeBbox";

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

  const existing = await prisma.location.findUnique({
    where: { id: params.id },
    include: { media: true, org: true },
  });
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

  const nextLat = body.lat != null ? Number(body.lat) : existing.lat;
  const nextLng = body.lng != null ? Number(body.lng) : existing.lng;
  if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) {
    return jsonError("lat/lng không hợp lệ");
  }
  if (isGeoValidationEnabled() && existing.org) {
    const geo = checkLatLngForOrg(existing.org, nextLat, nextLng);
    if (!geo.ok) return jsonError(geo.error, 400);
  }

  const location = await prisma.location.update({
    where: { id: params.id },
    data: {
      name: body.name ?? undefined,
      locationType: body.locationType ?? undefined,
      locationSubtype: body.locationSubtype ?? undefined,
      address: body.address ?? undefined,
      lat: body.lat != null ? nextLat : undefined,
      lng: body.lng != null ? nextLng : undefined,
      licenseNumber: body.licenseNumber ?? undefined,
      licenseConditions: body.licenseConditions ?? undefined,
      licenseDate: body.licenseDate ? new Date(body.licenseDate) : undefined,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
      operationStatus: body.operationStatus ?? undefined,
      note: body.note ?? undefined,
    },
    include: { media: true, org: true },
  });

  // Gắn ảnh mới (photoKeys) — chỉ thêm key chưa có
  const photoKeys: string[] = Array.isArray(body.photoKeys) ? body.photoKeys : [];
  if (photoKeys.length) {
    const existingKeys = new Set(
      (existing.media || []).map((m) => normalizeStorageKey(m.storageKey)),
    );
    const toAdd = photoKeys
      .map((k) => normalizeStorageKey(String(k)))
      .filter((k) => k && !existingKeys.has(k));

    if (toAdd.length) {
      const maxSort = existing.media.reduce((m, x) => Math.max(m, x.sortOrder), -1);
      await prisma.locationMedia.createMany({
        data: toAdd.map((storageKey, i) => ({
          locationId: params.id,
          storageKey,
          mimeType: null,
          sortOrder: maxSort + 1 + i,
        })),
      });
    }
  }

  const refreshed = await prisma.location.findUnique({
    where: { id: params.id },
    include: { media: true, org: true },
  });

  await writeAuditLog({
    actor: user,
    action: "location.update",
    entityType: "Location",
    entityId: params.id,
    meta: {
      name: refreshed?.name,
      addedMedia: photoKeys.length,
    },
    ip: clientIp(req),
  });

  return jsonOk({
    location: refreshed,
    locationTypeLabel: LOCATION_TYPE_LABELS[refreshed!.locationType],
  });
}
