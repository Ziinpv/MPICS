import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { locationWhereForUser } from "@/lib/permissions";
import { jsonError, jsonOk } from "@/lib/api";
import { LocationType, OperationStatus } from "@prisma/client";
import { LOCATION_TYPE_LABELS } from "@/lib/labels";

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

  const where: Record<string, unknown> = { ...locationWhereForUser(user) };
  if (locationType) where.locationType = locationType;
  if (operationStatus) where.operationStatus = operationStatus;

  const locations = await prisma.location.findMany({
    where,
    include: { org: { select: { name: true } } },
  });

  return jsonOk({
    type: "FeatureCollection",
    features: locations.map((l) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [l.lng, l.lat] },
      properties: {
        id: l.id,
        name: l.name,
        locationType: l.locationType,
        locationTypeLabel: LOCATION_TYPE_LABELS[l.locationType] || l.locationType,
        operationStatus: l.operationStatus,
        orgName: l.org.name,
        licenseNumber: l.licenseNumber,
      },
    })),
  });
}
