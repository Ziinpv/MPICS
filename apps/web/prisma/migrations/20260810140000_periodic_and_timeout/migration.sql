-- AlterTable BroadcastSchedule
ALTER TABLE "BroadcastSchedule" ADD COLUMN IF NOT EXISTS "intervalMinutes" INTEGER;
ALTER TABLE "BroadcastSchedule" ADD COLUMN IF NOT EXISTS "nextRunAt" TIMESTAMP(3);
ALTER TABLE "BroadcastSchedule" ADD COLUMN IF NOT EXISTS "endAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "BroadcastSchedule_nextRunAt_idx" ON "BroadcastSchedule"("nextRunAt");

-- AlterTable DeviceCommand
ALTER TABLE "DeviceCommand" ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3);
