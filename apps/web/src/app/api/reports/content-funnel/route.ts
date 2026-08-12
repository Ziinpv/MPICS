import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { ContentStatus, UserRole } from "@prisma/client";

const SEP = "\t";

function csvEscape(v: unknown) {
  const s = v == null ? "" : String(v);
  if (/["\t\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Funnel nội dung: draft → pending → approved → TTS → ready / rejected */
export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (user.role !== UserRole.ADMIN) return jsonError("Forbidden", 403);

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "json";
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();
  const from = searchParams.get("from")
    ? new Date(searchParams.get("from")!)
    : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

  const where = {
    org: { path: { startsWith: user.orgPath } },
    createdAt: { gte: from, lte: to },
  };

  const rows = await prisma.content.groupBy({
    by: ["status"],
    where,
    _count: { _all: true },
  });

  const byStatus: Record<string, number> = {};
  for (const r of rows) byStatus[r.status] = r._count._all;

  const statuses: ContentStatus[] = [
    "draft",
    "pending",
    "approved",
    "tts_processing",
    "ready_to_air",
    "rejected",
    "scheduled",
    "aired",
  ];
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);

  const summary = {
    from: from.toISOString(),
    to: to.toISOString(),
    total,
    byStatus: Object.fromEntries(statuses.map((s) => [s, byStatus[s] || 0])),
  };

  if (format !== "csv") return jsonOk({ summary });

  const header = ["TrangThai", "SoLuong"];
  const lines = [header.join(SEP), ["TONG", total].map(csvEscape).join(SEP)];
  for (const s of statuses) {
    lines.push([s, byStatus[s] || 0].map(csvEscape).join(SEP));
  }

  const filename = `bao-cao-content-funnel-${Date.now()}.csv`;
  const body = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(lines.join("\r\n"), "utf16le")]);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-16le",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
