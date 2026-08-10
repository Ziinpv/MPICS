-- AlterEnum ContentStatus
ALTER TYPE "ContentStatus" ADD VALUE IF NOT EXISTS 'tts_processing';

-- AlterTable Device
ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "mqttPasswordHash" TEXT;
ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "mqttPasswordSetAt" TIMESTAMP(3);

-- CreateEnum TtsJobStatus
DO $$ BEGIN
  CREATE TYPE "TtsJobStatus" AS ENUM ('queued', 'running', 'done', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable TtsJob
CREATE TABLE IF NOT EXISTS "TtsJob" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "status" "TtsJobStatus" NOT NULL DEFAULT 'queued',
    "voice" TEXT NOT NULL DEFAULT 'vi-VN-HoaiMyNeural',
    "driver" TEXT NOT NULL DEFAULT 'edge',
    "error" TEXT,
    "mediaAssetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "TtsJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TtsJob_status_createdAt_idx" ON "TtsJob"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "TtsJob_contentId_idx" ON "TtsJob"("contentId");

DO $$ BEGIN
  ALTER TABLE "TtsJob" ADD CONSTRAINT "TtsJob_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "TtsJob" ADD CONSTRAINT "TtsJob_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
