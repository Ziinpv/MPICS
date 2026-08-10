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
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (user.role !== UserRole.ADMIN) return jsonError("Forbidden", 403);

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action")?.trim() || "";
  const q = searchParams.get("q")?.trim() || "";
  const format = searchParams.get("format") || "json";
  const take = Math.min(Number(searchParams.get("limit") || (format === "csv" ? 2000 : 100)), 5000);

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(action ? { action: { contains: action } } : {}),
      ...(q
        ? {
            OR: [
              { actorUsername: { contains: q, mode: "insensitive" } },
              { entityId: { contains: q } },
              { action: { contains: q, mode: "insensitive" } },
              { entityType: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  if (format === "csv") {
    const header = ["STT", "ThoiGian", "Actor", "Action", "EntityType", "EntityId", "IP", "Meta"];
    const lines = [header.join(SEP)];
    logs.forEach((l, i) => {
      lines.push(
        [
          i + 1,
          formatViDate(new Date(l.createdAt)),
          l.actorUsername || "",
          l.action,
          l.entityType || "",
          l.entityId || "",
          l.ip || "",
          l.meta ? JSON.stringify(l.meta) : "",
        ]
          .map(csvEscape)
          .join(SEP),
      );
    });
    const filename = `audit-log-${Date.now()}.csv`;
    const body = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(lines.join("\r\n"), "utf16le")]);
    return new Response(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-16le",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return jsonOk({ logs, count: logs.length });
}
