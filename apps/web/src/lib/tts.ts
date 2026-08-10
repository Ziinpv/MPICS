import { spawn } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { putMediaObject, mediaUrl } from "@/lib/storage";
import { sha256Hex, signMediaChecksum } from "@/lib/mediaSign";

export type TtsDriver = "edge" | "mock";

export function ttsDriver(): TtsDriver {
  const d = (process.env.TTS_DRIVER || "edge").toLowerCase();
  return d === "mock" ? "mock" : "edge";
}

export function ttsVoice() {
  return process.env.TTS_VOICE || "vi-VN-HoaiMyNeural";
}

/** MP3 tối thiểu hợp lệ (silent frame) — fallback / CI */
function minimalMp3(): Buffer {
  // MPEG frame header + padding — đủ để player/file type nhận audio/mpeg
  const b = Buffer.alloc(128, 0);
  b[0] = 0xff;
  b[1] = 0xfb;
  b[2] = 0x90;
  b[3] = 0x00;
  return b;
}

function runCmd(cmd: string, args: string[], timeoutMs = 120_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], shell: true });
    let err = "";
    const t = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`TTS timeout ${timeoutMs}ms`));
    }, timeoutMs);
    child.stderr?.on("data", (d) => {
      err += d.toString();
    });
    child.on("error", (e) => {
      clearTimeout(t);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(t);
      if (code === 0) resolve();
      else reject(new Error(err || `edge-tts exit ${code}`));
    });
  });
}

/** Sinh MP3 bằng edge-tts CLI (Python). Cần: pip install edge-tts */
export async function synthesizeEdgeTts(text: string, voice: string): Promise<Buffer> {
  const dir = await mkdtemp(path.join(tmpdir(), "mpcis-tts-"));
  const textFile = path.join(dir, "in.txt");
  const outFile = path.join(dir, "out.mp3");
  try {
    await writeFile(textFile, text, "utf8");
    const py = process.env.TTS_PYTHON || "python";
    // edge-tts module entry
    await runCmd(py, [
      "-m",
      "edge_tts",
      "--voice",
      voice,
      "--file",
      textFile,
      "--write-media",
      outFile,
    ]);
    return await readFile(outFile);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function synthesizeTts(text: string, voice: string, driver: TtsDriver): Promise<Buffer> {
  if (driver === "mock") {
    const payload = Buffer.concat([
      minimalMp3(),
      Buffer.from(`\nMPCIS-MOCK-TTS:${createHash("md5").update(text).digest("hex")}\n`),
    ]);
    return payload;
  }
  try {
    return await synthesizeEdgeTts(text, voice);
  } catch (e: any) {
    if (process.env.TTS_FALLBACK_MOCK === "1") {
      console.warn("[tts] edge failed, fallback mock:", e?.message);
      return synthesizeTts(text, voice, "mock");
    }
    throw e;
  }
}

/** Chạy 1 job: synthesize → storage → MediaAsset → content ready_to_air */
export async function processTtsJob(jobId: string) {
  const job = await prisma.ttsJob.findUnique({
    where: { id: jobId },
    include: { content: true },
  });
  if (!job) throw new Error("TtsJob not found");
  if (job.status === "done") return job;

  await prisma.ttsJob.update({
    where: { id: jobId },
    data: { status: "running", error: null },
  });
  await prisma.content.update({
    where: { id: job.contentId },
    data: { status: "tts_processing" },
  });

  try {
    const driver = (job.driver === "mock" ? "mock" : ttsDriver()) as TtsDriver;
    const voice = job.voice || ttsVoice();
    const audio = await synthesizeTts(job.content.bodyPlain, voice, driver);
    const checksum = sha256Hex(audio);
    const storageKey = `tts/${job.contentId}/${Date.now()}.mp3`;
    const stored = await putMediaObject({
      key: storageKey,
      body: audio,
      contentType: "audio/mpeg",
    });
    const signature = signMediaChecksum(checksum, stored.storageKey);
    const durationSec = Math.max(15, Math.round(job.content.bodyPlain.length / 12));

    const media = await prisma.mediaAsset.create({
      data: {
        storageKey: stored.storageKey,
        cdnUrl: stored.url || mediaUrl(stored.storageKey),
        mimeType: "audio/mpeg",
        durationSec,
        checksum,
        signature,
      },
    });

    await prisma.content.update({
      where: { id: job.contentId },
      data: { status: "ready_to_air", mediaAssetId: media.id },
    });

    return prisma.ttsJob.update({
      where: { id: jobId },
      data: {
        status: "done",
        mediaAssetId: media.id,
        driver,
        finishedAt: new Date(),
        error: null,
      },
      include: { mediaAsset: true, content: true },
    });
  } catch (e: any) {
    const msg = e?.message || String(e);
    await prisma.ttsJob.update({
      where: { id: jobId },
      data: { status: "failed", error: msg, finishedAt: new Date() },
    });
    await prisma.content.update({
      where: { id: job.contentId },
      data: { status: "approved" },
    });
    throw e;
  }
}

/** Tạo job + chạy sync (approve flow) */
export async function enqueueAndRunTts(contentId: string, opts?: { voice?: string; sync?: boolean }) {
  const driver = ttsDriver();
  const job = await prisma.ttsJob.create({
    data: {
      contentId,
      voice: opts?.voice || ttsVoice(),
      driver,
      status: "queued",
    },
  });

  const sync = opts?.sync !== false && process.env.TTS_ASYNC !== "1";
  if (sync) {
    const done = await processTtsJob(job.id);
    return { job: done, sync: true };
  }
  return { job, sync: false };
}
