/**
 * Smoke Path B TTS: tạo content nháp → enqueue TTS → expect ready_to_air
 * Usage: npm run tts:smoke
 */
import { prisma } from "../src/lib/prisma";
import { enqueueAndRunTts } from "../src/lib/tts";

async function main() {
  const admin = await prisma.user.findFirst({ where: { username: "admin" } });
  if (!admin) throw new Error("Thiếu user admin — chạy db:seed");

  const content = await prisma.content.create({
    data: {
      title: `Smoke TTS ${new Date().toISOString()}`,
      bodyPlain: "Thông báo thử nghiệm hệ thống phát thanh cơ sở MPCIS.",
      category: "admin_notice",
      status: "draft",
      orgId: admin.orgId,
      authorId: admin.id,
    },
  });
  console.log("[smoke] content", content.id);

  const { job, sync } = await enqueueAndRunTts(content.id, { sync: true });
  const updated = await prisma.content.findUnique({
    where: { id: content.id },
    include: { mediaAsset: true },
  });

  console.log(
    JSON.stringify(
      {
        sync,
        jobStatus: job.status,
        jobError: job.error,
        contentStatus: updated?.status,
        mediaKey: updated?.mediaAsset?.storageKey,
        driver: job.driver,
      },
      null,
      2,
    ),
  );

  if (updated?.status !== "ready_to_air" || !updated.mediaAssetId) {
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
