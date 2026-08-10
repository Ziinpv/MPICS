import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { CommandStatus, UserRole } from "@prisma/client";

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

/** Export lệnh IoT (pending/sent/acked/timeout/failed) theo subtree Admin */
export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);
  if (user.role !== UserRole.ADMIN) return jsonError("Forbidden", 403);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as CommandStatus | null;
  const format = searchParams.get("format") || "csv";
  const take = Math.min(Number(searchParams.get("limit") || 2000), 5000);

  const where: Record<string, unknown> = {
    device: { org: { path: { startsWith: user.orgPath } } },
  };
  if (status) where.status = status;

  const commands = await prisma.deviceCommand.findMany({
    where,
    take,
    orderBy: { createdAt: "desc" },
    include: {
      device: { select: { deviceCode: true, name: true, org: { select: { name: true } } } },
    },
  });

  if (format !== "csv") {
    return Response.json({ commands, count: commands.length });
  }

  const header = [
    "STT",
    "ThoiGian",
    "DeviceCode",
    "DeviceName",
    "Xa",
    "Lenh",
    "TrangThai",
    "ScheduleId",
    "SentAt",
    "AckedAt",
  ];
  const lines = [header.join(SEP)];
  commands.forEach((c, i) => {
    lines.push(
      [
        i + 1,
        formatViDate(new Date(c.createdAt)),
        c.device.deviceCode,
        c.device.name,
        c.device.org?.name || "",
        c.commandType,
        c.status,
        c.scheduleId || "",
        c.sentAt ? formatViDate(new Date(c.sentAt)) : "",
        c.ackedAt ? formatViDate(new Date(c.ackedAt)) : "",
      ]
        .map(csvEscape)
        .join(SEP),
    );
  });

  const filename = `bao-cao-lenh-iot${status ? `-${status}` : ""}-${Date.now()}.csv`;
  const body = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(lines.join("\r\n"), "utf16le")]);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-16le",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
