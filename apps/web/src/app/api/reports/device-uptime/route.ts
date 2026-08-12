import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { UserRole } from "@prisma/client";

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

function parseRange(searchParams: URLSearchParams) {
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();
  const from = searchParams.get("from")
    ? new Date(searchParams.get("from")!)
    : new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { from, to };
}

/** Device uptime ước lượng từ DeviceAlert offline trong khoảng thời gian */
export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (user.role !== UserRole.ADMIN) return jsonError("Forbidden", 403);

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "json";
  const { from, to } = parseRange(searchParams);
  const rangeMs = Math.max(to.getTime() - from.getTime(), 1);

  const devices = await prisma.device.findMany({
    where: { org: { path: { startsWith: user.orgPath } } },
    include: {
      cluster: { select: { name: true, code: true } },
      org: { select: { name: true } },
      alerts: {
        where: {
          type: "offline",
          createdAt: { lte: to },
          OR: [{ resolvedAt: null }, { resolvedAt: { gte: from } }],
        },
      },
    },
    orderBy: { deviceCode: "asc" },
  });

  const rows = devices.map((d) => {
    let downtimeMs = 0;
    for (const a of d.alerts) {
      const start = Math.max(a.createdAt.getTime(), from.getTime());
      const end = Math.min((a.resolvedAt || to).getTime(), to.getTime());
      if (end > start) downtimeMs += end - start;
    }
    downtimeMs = Math.min(downtimeMs, rangeMs);
    const uptimePct = Math.round(((rangeMs - downtimeMs) / rangeMs) * 1000) / 10;
    return {
      deviceId: d.id,
      deviceCode: d.deviceCode,
      name: d.name,
      orgName: d.org?.name || "",
      clusterName: d.cluster?.name || "",
      online: d.online,
      status: d.status,
      lastSeenAt: d.lastSeenAt,
      offlineEvents: d.alerts.length,
      downtimeMinutes: Math.round(downtimeMs / 60000),
      uptimePct,
    };
  });

  const summary = {
    from: from.toISOString(),
    to: to.toISOString(),
    deviceCount: rows.length,
    onlineNow: rows.filter((r) => r.online).length,
    avgUptimePct:
      rows.length === 0
        ? 0
        : Math.round((rows.reduce((s, r) => s + r.uptimePct, 0) / rows.length) * 10) / 10,
  };

  if (format !== "csv") {
    return jsonOk({ summary, rows });
  }

  const header = [
    "STT",
    "DeviceCode",
    "Ten",
    "Xa",
    "Cum",
    "Online",
    "Status",
    "LastSeen",
    "OfflineEvents",
    "DowntimePhut",
    "UptimePct",
  ];
  const lines = [header.join(SEP)];
  rows.forEach((r, i) => {
    lines.push(
      [
        i + 1,
        r.deviceCode,
        r.name,
        r.orgName,
        r.clusterName,
        r.online ? "1" : "0",
        r.status,
        r.lastSeenAt ? formatViDate(new Date(r.lastSeenAt)) : "",
        r.offlineEvents,
        r.downtimeMinutes,
        r.uptimePct,
      ]
        .map(csvEscape)
        .join(SEP),
    );
  });

  const filename = `bao-cao-uptime-${Date.now()}.csv`;
  const body = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(lines.join("\r\n"), "utf16le")]);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-16le",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
