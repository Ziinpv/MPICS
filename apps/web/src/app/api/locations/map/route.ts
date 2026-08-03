import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { LocationType, OperationStatus, UserRole } from "@prisma/client";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const locationType = searchParams.get("location_type") as LocationType | null;
  const operationStatus = searchParams.get("operation_status") as OperationStatus | null;

  const where: Record<string, unknown> = {};
  if (user.role === UserRole.USER) where.orgId = user.orgId;
  else where.org = { path: { startsWith: user.orgPath } };
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
        operationStatus: l.operationStatus,
        orgName: l.org.name,
        licenseNumber: l.licenseNumber,
      },
    })),
  });
}
