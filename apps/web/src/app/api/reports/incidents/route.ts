import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { IncidentStatus, UserRole } from "@prisma/client";

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

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (user.role !== UserRole.ADMIN) return jsonError("Forbidden", 403);

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "json";
  const status = searchParams.get("status") as IncidentStatus | null;
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();
  const from = searchParams.get("from")
    ? new Date(searchParams.get("from")!)
    : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

  const where: Record<string, unknown> = {
    org: { path: { startsWith: user.orgPath } },
    createdAt: { gte: from, lte: to },
  };
  if (status) where.status = status;

  const incidents = await prisma.incidentReport.findMany({
    where,
    include: {
      device: { select: { deviceCode: true, name: true } },
      reporter: { select: { fullName: true } },
      assignee: { select: { fullName: true } },
      org: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const byStatus: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  let mttrSum = 0;
  let mttrN = 0;
  for (const i of incidents) {
    byStatus[i.status] = (byStatus[i.status] || 0) + 1;
    bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
    if (i.resolvedAt) {
      mttrSum += i.resolvedAt.getTime() - i.createdAt.getTime();
      mttrN += 1;
    }
  }

  const summary = {
    from: from.toISOString(),
    to: to.toISOString(),
    total: incidents.length,
    byStatus,
    bySeverity,
    mttrMinutes: mttrN ? Math.round(mttrSum / mttrN / 60000) : null,
    resolvedCount: mttrN,
  };

  if (format !== "csv") {
    return jsonOk({
      summary,
      incidents: incidents.map((i) => ({
        id: i.id,
        title: i.title,
        status: i.status,
        severity: i.severity,
        deviceCode: i.device.deviceCode,
        deviceName: i.device.name,
        orgName: i.org?.name,
        reporter: i.reporter?.fullName,
        assignee: i.assignee?.fullName,
        createdAt: i.createdAt,
        resolvedAt: i.resolvedAt,
        mttrMinutes: i.resolvedAt
          ? Math.round((i.resolvedAt.getTime() - i.createdAt.getTime()) / 60000)
          : null,
      })),
    });
  }

  const header = [
    "STT",
    "TieuDe",
    "TrangThai",
    "MucDo",
    "DeviceCode",
    "DeviceName",
    "Xa",
    "NguoiBao",
    "Assignee",
    "TaoLuc",
    "ResolveLuc",
    "MTTR_Phut",
  ];
  const lines = [header.join(SEP)];
  incidents.forEach((i, idx) => {
    const mttr = i.resolvedAt
      ? Math.round((i.resolvedAt.getTime() - i.createdAt.getTime()) / 60000)
      : "";
    lines.push(
      [
        idx + 1,
        i.title,
        i.status,
        i.severity,
        i.device.deviceCode,
        i.device.name,
        i.org?.name || "",
        i.reporter?.fullName || "",
        i.assignee?.fullName || "",
        formatViDate(i.createdAt),
        i.resolvedAt ? formatViDate(i.resolvedAt) : "",
        mttr,
      ]
        .map(csvEscape)
        .join(SEP),
    );
  });

  const filename = `bao-cao-su-co-${Date.now()}.csv`;
  const body = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(lines.join("\r\n"), "utf16le")]);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-16le",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
