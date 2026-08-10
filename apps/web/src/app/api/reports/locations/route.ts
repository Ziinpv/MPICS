import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { LocationType, OperationStatus, UserRole } from "@prisma/client";
import { LOCATION_TYPE_LABELS, OPERATION_STATUS_LABELS } from "@/lib/labels";
import { canExportLocations, locationWhereForUser } from "@/lib/permissions";

const SEP = "\t";

function csvEscape(v: unknown) {
  const s = v == null ? "" : String(v);
  if (/["\t\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function formatViDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatCoord(n: number, digits = 6) {
  if (!Number.isFinite(n)) return "";
  return n.toFixed(digits);
}

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (!canExportLocations(user)) return jsonError("Forbidden", 403);

  const { searchParams } = new URL(req.url);
  const locationType = searchParams.get("location_type") as LocationType | null;
  const operationStatus = searchParams.get("operation_status") as OperationStatus | null;
  const orgId = searchParams.get("org_id");
  const format = searchParams.get("format") || "csv";

  const where: Record<string, unknown> = { ...locationWhereForUser(user) };
  if (locationType) where.locationType = locationType;
  if (operationStatus) where.operationStatus = operationStatus;

  // Admin có thể thu hẹp thêm 1 xã — phải thuộc subtree
  if (orgId && user.role === UserRole.ADMIN) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org || !org.path.startsWith(user.orgPath)) {
      return jsonError("org_id ngoài phạm vi", 403);
    }
    where.orgId = orgId;
    delete where.org;
  }

  const locations = await prisma.location.findMany({
    where,
    include: {
      org: { select: { name: true, code: true } },
      createdBy: { select: { fullName: true, username: true } },
      media: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (format !== "csv") {
    return Response.json({ locations });
  }

  const header = [
    "STT",
    "Ten",
    "DiaChi",
    "PhuongXa",
    "PhanLoai",
    "ChiTietLoai",
    "TrangThai",
    "GiayPhep",
    "NgayTao",
    "NguoiTao",
    "SoAnh",
    "Lat",
    "Lng",
  ];

  const lines = [header.join(SEP)];
  locations.forEach((l, i) => {
    lines.push(
      [
        i + 1,
        l.name,
        l.address,
        l.org?.name,
        LOCATION_TYPE_LABELS[l.locationType] || l.locationType,
        l.locationSubtype || "",
        OPERATION_STATUS_LABELS[l.operationStatus] || l.operationStatus,
        l.licenseNumber || "",
        formatViDate(new Date(l.createdAt)),
        l.createdBy?.fullName || l.createdBy?.username || "",
        l.media.length,
        formatCoord(l.lat),
        formatCoord(l.lng),
      ]
        .map(csvEscape)
        .join(SEP),
    );
  });

  const filename = `bao-cao-dia-diem${locationType ? `-${locationType}` : ""}-${Date.now()}.csv`;
  const text = lines.join("\r\n");
  const utf16 = Buffer.from(text, "utf16le");
  const bom = Buffer.from([0xff, 0xfe]);
  const body = Buffer.concat([bom, utf16]);

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-16le",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
