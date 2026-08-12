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

/** Báo cáo phát sóng: play logs + success rate theo schedule/ngày */
export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (user.role !== UserRole.ADMIN) return jsonError("Forbidden", 403);

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "json";
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();
  const from = searchParams.get("from")
    ? new Date(searchParams.get("from")!)
    : new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);

  const logs = await prisma.devicePlayLog.findMany({
    where: {
      playedAt: { gte: from, lte: to },
      device: { org: { path: { startsWith: user.orgPath } } },
    },
    include: {
      device: {
        select: {
          deviceCode: true,
          name: true,
          cluster: { select: { name: true } },
          org: { select: { name: true } },
        },
      },
    },
    orderBy: { playedAt: "desc" },
    take: 5000,
  });

  const ok = logs.filter((l) => l.status === "ok").length;
  const err = logs.length - ok;
  const bySchedule = new Map<string, { ok: number; error: number; title?: string | null }>();
  for (const l of logs) {
    const key = l.scheduleId || "(no-schedule)";
    const row = bySchedule.get(key) || { ok: 0, error: 0, title: l.title };
    if (l.status === "ok") row.ok += 1;
    else row.error += 1;
    if (l.title) row.title = l.title;
    bySchedule.set(key, row);
  }

  const summary = {
    from: from.toISOString(),
    to: to.toISOString(),
    totalPlays: logs.length,
    ok,
    error: err,
    successRatePct: logs.length ? Math.round((ok / logs.length) * 1000) / 10 : null,
    bySchedule: Array.from(bySchedule.entries()).map(([scheduleId, v]) => ({
      scheduleId,
      ...v,
      total: v.ok + v.error,
    })),
  };

  if (format !== "csv") {
    return jsonOk({
      summary,
      logs: logs.map((l) => ({
        id: l.id,
        playedAt: l.playedAt,
        status: l.status,
        title: l.title,
        scheduleId: l.scheduleId,
        deviceCode: l.device.deviceCode,
        deviceName: l.device.name,
        clusterName: l.device.cluster?.name,
        orgName: l.device.org?.name,
        error: l.error,
      })),
    });
  }

  const header = [
    "STT",
    "PlayedAt",
    "Status",
    "Title",
    "ScheduleId",
    "DeviceCode",
    "DeviceName",
    "Cum",
    "Xa",
    "Error",
  ];
  const lines = [header.join(SEP)];
  logs.forEach((l, i) => {
    lines.push(
      [
        i + 1,
        formatViDate(l.playedAt),
        l.status,
        l.title || "",
        l.scheduleId || "",
        l.device.deviceCode,
        l.device.name,
        l.device.cluster?.name || "",
        l.device.org?.name || "",
        l.error || "",
      ]
        .map(csvEscape)
        .join(SEP),
    );
  });

  const filename = `bao-cao-phat-song-${Date.now()}.csv`;
  const body = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(lines.join("\r\n"), "utf16le")]);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-16le",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
