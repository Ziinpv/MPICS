import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export async function writeAuditLog(input: {
  actor?: SessionUser | null;
  action: string;
  entityType?: string;
  entityId?: string;
  meta?: Prisma.InputJsonValue;
  ip?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actor?.id ?? null,
        actorUsername: input.actor?.username ?? null,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        meta: input.meta ?? undefined,
        ip: input.ip ?? null,
      },
    });
  } catch (err) {
    // Không làm fail request nghiệp vụ nếu audit lỗi
    console.error("[audit]", err);
  }
}
