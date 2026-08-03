import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { UserRole } from "@prisma/client";

export async function GET(_req: NextRequest) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);

  const where =
    user.role === UserRole.USER
      ? { orgId: user.orgId }
      : { org: { path: { startsWith: user.orgPath } } };

  const devices = await prisma.device.findMany({ where });
  return jsonOk({
    type: "FeatureCollection",
    features: devices
      .filter((d) => d.lat != null && d.lng != null)
      .map((d) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [d.lng!, d.lat!] },
        properties: {
          id: d.id,
          name: d.name,
          online: d.online,
          deviceCode: d.deviceCode,
          type: d.type,
        },
      })),
  });
}
