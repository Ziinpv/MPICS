import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/api";

/** Bridge đánh dấu lệnh đã gửi qua MQTT */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.commandId) return jsonError("Thiếu commandId");

  const existing = await prisma.deviceCommand.findUnique({ where: { id: body.commandId } });
  if (!existing) return jsonError("Not found", 404);
  if (existing.status !== "pending") {
    return jsonOk({ command: existing, skipped: true });
  }

  const command = await prisma.deviceCommand.update({
    where: { id: body.commandId },
    data: { status: "sent", sentAt: new Date() },
  });

  return jsonOk({ command });
}
