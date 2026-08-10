import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { LocationType, UserRole } from "@prisma/client";
import { LOCATION_TYPE_LABELS, OPERATION_STATUS_LABELS } from "@/lib/labels";

/** Excel locale VN dùng `;` làm delimiter (dấu `,` là thập phân). */
const SEP = ";";

function csvEscape(v: unknown) {
  const s = v == null ? "" : String(v);
  if (/[";\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function formatViDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (user.role !== UserRole.ADMIN) return jsonError("Forbidden", 403);

  const { searchParams } = new URL(req.url);
  const locationType = searchParams.get("location_type") as LocationType | null;
  const format = searchParams.get("format") || "csv";

  const where: Record<string, unknown> = {
    org: { path: { startsWith: user.orgPath } },
  };
  if (locationType) where.locationType = locationType;

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
        // Dấu thập phân `.` — Excel VN vẫn nhận số khi cột tách bằng `;`
        String(l.lat),
        String(l.lng),
      ]
        .map(csvEscape)
        .join(SEP),
    );
  });

  const filename = `bao-cao-dia-diem${locationType ? `-${locationType}` : ""}-${Date.now()}.csv`;
  // BOM + sep= giúp Excel nhận đúng delimiter
  const body = `\uFEFFsep=${SEP}\n` + lines.join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
