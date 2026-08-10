/**
 * Xử lý TtsJob queued (hoặc --job=id)
 * Usage: npm run tts:worker
 *        npm run tts:worker -- --once
 */
import { prisma } from "../src/lib/prisma";
import { processTtsJob } from "../src/lib/tts";

async function main() {
  const once = process.argv.includes("--once") || process.env.TTS_WORKER_ONCE === "1";
  const jobArg = process.argv.find((a) => a.startsWith("--job="))?.slice(6);

  if (jobArg) {
    const r = await processTtsJob(jobArg);
    console.log(JSON.stringify({ ok: true, job: r }, null, 2));
    return;
  }

  do {
    const queued = await prisma.ttsJob.findMany({
      where: { status: "queued" },
      orderBy: { createdAt: "asc" },
      take: 5,
    });
    if (!queued.length) {
      console.log("[tts-worker] idle");
      if (once) break;
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }
    for (const j of queued) {
      try {
        const r = await processTtsJob(j.id);
        console.log(`[tts-worker] done ${j.id} → ${r.status}`);
      } catch (e: any) {
        console.error(`[tts-worker] fail ${j.id}`, e?.message || e);
      }
    }
    if (once) break;
  } while (true);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
