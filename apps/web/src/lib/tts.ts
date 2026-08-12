import { spawn } from "child_process";
import { existsSync } from "fs";
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

export type TtsVoiceOpts = {
  voice?: string;
  voiceGender?: "male" | "female" | string | null;
  region?: "north" | "central" | "south" | string | null;
  speed?: number | null;
};

/** Map gender/region → edge neural voice (VN hiện có 2 giọng chính). */
export function resolveTtsVoice(opts?: TtsVoiceOpts): string {
  if (opts?.voice?.trim()) return opts.voice.trim();
  const gender = (opts?.voiceGender || "").toLowerCase();
  if (gender === "male" || gender === "nam") return "vi-VN-NamMinhNeural";
  if (gender === "female" || gender === "nu" || gender === "nữ") return "vi-VN-HoaiMyNeural";
  // region: edge-tts chưa có bộ đủ Bắc/Trung/Nam — giữ giọng mặc định / theo gender
  return ttsVoice();
}

/** speed 0.8–1.5 → edge-tts rate string */
export function speedToEdgeRate(speed?: number | null): string {
  const s = speed == null || !Number.isFinite(speed) ? 1 : Math.min(1.5, Math.max(0.8, speed));
  const pct = Math.round((s - 1) * 100);
  if (pct === 0) return "+0%";
  return pct > 0 ? `+${pct}%` : `${pct}%`;
}

function resolvePython(): string {
  if (process.env.TTS_PYTHON?.trim()) return process.env.TTS_PYTHON.trim();
  const local = process.env.LOCALAPPDATA || "";
  const candidates = [
    path.join(local, "Python", "bin", "python.exe"),
    path.join(local, "Python", "pythoncore-3.14-64", "python.exe"),
  ];
  for (const c of candidates) {
    if (c.length > 12 && existsSync(c)) return c;
  }
  return process.platform === "win32" ? "py" : "python3";
}

/** MP3 tối thiểu hợp lệ (silent frame) — fallback / CI */
function minimalMp3(): Buffer {
  const b = Buffer.alloc(128, 0);
  b[0] = 0xff;
  b[1] = 0xfb;
  b[2] = 0x90;
  b[3] = 0x00;
  return b;
}

function runCmd(cmd: string, args: string[], timeoutMs = 120_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const useShell = process.platform === "win32" && (cmd === "py" || !cmd.includes("\\"));
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], shell: useShell });
    let err = "";
    const t = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`TTS timeout ${timeoutMs}ms`));
    }, timeoutMs);
    child.stderr?.on("data", (d) => {
      err += d.toString();
    });
    child.stdout?.on("data", () => undefined);
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

/** Sinh MP3 bằng edge-tts (Python helper — ổn định hơn CLI trên Windows). */
export async function synthesizeEdgeTts(
  text: string,
  voice: string,
  rate = "+0%",
): Promise<Buffer> {
  const dir = await mkdtemp(path.join(tmpdir(), "mpcis-tts-"));
  const textFile = path.join(dir, "in.txt");
  const outFile = path.join(dir, "out.mp3");
  const helper = path.join(process.cwd(), "scripts", "edge_tts_run.py");
  try {
    await writeFile(textFile, text.replace(/^\uFEFF/, "").trim() + "\n", "utf8");
    const py = resolvePython();
    if (existsSync(helper)) {
      await runCmd(py, [helper, textFile, voice, outFile, rate]);
    } else {
      await runCmd(py, [
        "-m",
        "edge_tts",
        "--voice",
        voice,
        "--rate",
        rate,
        "--file",
        textFile,
        "--write-media",
        outFile,
      ]);
    }
    const buf = await readFile(outFile);
    if (buf.length < 100) throw new Error("edge-tts output too small");
    return buf;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function synthesizeTts(
  text: string,
  voice: string,
  driver: TtsDriver,
  rate = "+0%",
): Promise<{ audio: Buffer; driver: TtsDriver }> {
  if (driver === "mock") {
    const payload = Buffer.concat([
      minimalMp3(),
      Buffer.from(`\nMPCIS-MOCK-TTS:${createHash("md5").update(text + rate).digest("hex")}\n`),
    ]);
    return { audio: payload, driver: "mock" };
  }
  try {
    const audio = await synthesizeEdgeTts(text, voice, rate);
    if (!audio.length) throw new Error("edge-tts empty audio");
    return { audio, driver: "edge" };
  } catch (e: any) {
    // Retry 1 lần (edge đôi khi NoAudioReceived)
    try {
      const audio = await synthesizeEdgeTts(text, voice, rate);
      if (!audio.length) throw new Error("edge-tts empty audio");
      return { audio, driver: "edge" };
    } catch (e2: any) {
      if (process.env.TTS_FALLBACK_MOCK === "1") {
        console.warn("[tts] edge failed, fallback mock:", e2?.message || e?.message);
        return synthesizeTts(text, voice, "mock", rate);
      }
      throw e2;
    }
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
    const preferred = (job.driver === "mock" ? "mock" : ttsDriver()) as TtsDriver;
    const voice = job.voice || ttsVoice();
    const rate = speedToEdgeRate(job.speed);
    const { audio, driver } = await synthesizeTts(job.content.bodyPlain, voice, preferred, rate);
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

/** Tạo job + chạy sync (approve / run_tts / API tts/jobs) */
export async function enqueueAndRunTts(
  contentId: string,
  opts?: TtsVoiceOpts & { sync?: boolean },
) {
  const driver = ttsDriver();
  const voice = resolveTtsVoice(opts);
  const speed =
    opts?.speed != null && Number.isFinite(Number(opts.speed))
      ? Math.min(1.5, Math.max(0.8, Number(opts.speed)))
      : 1.0;
  const voiceGender = opts?.voiceGender ? String(opts.voiceGender) : null;
  const region = opts?.region ? String(opts.region) : null;

  const job = await prisma.ttsJob.create({
    data: {
      contentId,
      voice,
      voiceGender,
      region,
      speed,
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
