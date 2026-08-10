import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canCreateLocation } from "@/lib/permissions";
import { jsonError, jsonOk } from "@/lib/api";
import { LocationType, OperationStatus, UserRole } from "@prisma/client";
import { LOCATION_TYPE_LABELS, requiresLicenseDocs } from "@/lib/labels";
import { normalizeStorageKey } from "@/lib/mediaUrl";

const VALID_LOCATION_TYPES = new Set(Object.keys(LOCATION_TYPE_LABELS));

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const locationType = searchParams.get("location_type") as LocationType | null;
  const operationStatus = searchParams.get("operation_status") as OperationStatus | null;

  if (locationType && !VALID_LOCATION_TYPES.has(locationType)) {
    return jsonError(
      `location_type không hợp lệ. Hỗ trợ: ${Array.from(VALID_LOCATION_TYPES).join(", ")}`,
    );
  }

  const where: Record<string, unknown> = {};
  if (user.role === UserRole.USER) {
    where.orgId = user.orgId;
  } else {
    where.org = { path: { startsWith: user.orgPath } };
  }
  if (locationType) where.locationType = locationType;
  if (operationStatus) where.operationStatus = operationStatus;

  const locations = await prisma.location.findMany({
    where,
    include: {
      org: true,
      media: true,
      createdBy: { select: { fullName: true, username: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return jsonOk({
    locations,
    locationTypeLabels: LOCATION_TYPE_LABELS,
  });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canCreateLocation(user)) return jsonError("Forbidden", 403);

  const body = await req.json().catch(() => null);
  if (!body?.name || body.lat == null || body.lng == null || !body.locationType) {
    return jsonError("Thiếu name / lat / lng / locationType");
  }
  if (!VALID_LOCATION_TYPES.has(body.locationType)) {
    return jsonError(
      `locationType không hợp lệ. Hỗ trợ: ${Array.from(VALID_LOCATION_TYPES).join(", ")}`,
    );
  }
  if (!body.address?.trim()) {
    return jsonError("Thiếu địa chỉ");
  }
  if (!body.operationStatus) {
    return jsonError("Thiếu tình trạng hoạt động");
  }

  const needsLicense = requiresLicenseDocs(body.locationType);
  if (needsLicense) {
    if (!body.licenseNumber?.trim()) {
      return jsonError("Địa điểm văn hóa / tín ngưỡng bắt buộc có số giấy phép / văn bản");
    }
    if (!body.licenseDate) {
      return jsonError("Địa điểm văn hóa / tín ngưỡng bắt buộc có ngày cấp");
    }
  }

  const orgId = user.role === UserRole.USER ? user.orgId : body.orgId || user.orgId;
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return jsonError("Org không tồn tại", 404);
  if (user.role === UserRole.USER && orgId !== user.orgId) {
    return jsonError("Chỉ tạo địa điểm trong xã của bạn", 403);
  }

  let provinceOrgId: string | null = null;
  const parts = org.path.split("/").filter(Boolean);
  if (parts.length) {
    const province = await prisma.organization.findFirst({
      where: { code: parts[0], type: "province" },
    });
    provinceOrgId = province?.id ?? null;
  }

  const location = await prisma.location.create({
    data: {
      name: body.name,
      orgId,
      provinceOrgId,
      createdById: user.id,
      locationType: body.locationType,
      locationSubtype: body.locationSubtype || null,
      address: body.address.trim(),
      lat: Number(body.lat),
      lng: Number(body.lng),
      licenseNumber: needsLicense ? body.licenseNumber.trim() : null,
      licenseConditions: needsLicense ? body.licenseConditions || null : null,
      licenseDate: needsLicense && body.licenseDate ? new Date(body.licenseDate) : null,
      expiryDate: needsLicense && body.expiryDate ? new Date(body.expiryDate) : null,
      operationStatus: body.operationStatus || "active",
      note: body.note || null,
      media: body.photoKeys?.length
        ? {
            create: (body.photoKeys as string[])
              .map((storageKey: string) => normalizeStorageKey(String(storageKey)))
              .filter(Boolean)
              .map((storageKey: string, i: number) => ({
                storageKey,
                sortOrder: i,
                mimeType: "image/jpeg",
              })),
          }
        : undefined,
    },
    include: { media: true, org: true },
  });

  return jsonOk(
    {
      location,
      locationTypeLabel: LOCATION_TYPE_LABELS[location.locationType],
    },
    { status: 201 },
  );
}
