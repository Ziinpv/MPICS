import { prisma } from "@/lib/prisma";

/** Ghi play log khi device ack lệnh play (HTTP sim hoặc MQTT bridge). */
export async function recordPlayLogFromCommand(commandId: string, opts?: { error?: string }) {
  const command = await prisma.deviceCommand.findUnique({ where: { id: commandId } });
  if (!command || command.commandType !== "play") return null;

  const payload = (command.payload || {}) as {
    title?: string;
    scheduleId?: string;
  };

  return prisma.devicePlayLog.create({
    data: {
      deviceId: command.deviceId,
      commandId: command.id,
      scheduleId: command.scheduleId || payload.scheduleId || null,
      title: payload.title || null,
      status: opts?.error ? "error" : "ok",
      error: opts?.error || null,
      playedAt: new Date(),
    },
  });
}
