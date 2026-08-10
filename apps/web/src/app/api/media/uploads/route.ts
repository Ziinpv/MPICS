import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { putMediaObject } from "@/lib/storage";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return jsonError("Thiếu file");

  if (file.size > MAX_BYTES) {
    return jsonError("File quá lớn (tối đa 8MB)", 413);
  }

  const mime = file.type || "application/octet-stream";
  if (!ALLOWED.has(mime) && !/\.(jpe?g|png|webp|gif)$/i.test(file.name)) {
    return jsonError("Chỉ chấp nhận ảnh JPEG/PNG/WebP/GIF");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const key = `uploads/${filename}`;

  try {
    const saved = await putMediaObject({
      key,
      body: bytes,
      contentType: mime.startsWith("image/") ? mime : guessMime(ext),
    });
    return jsonOk({
      storageKey: saved.storageKey,
      url: saved.url,
      driver: process.env.STORAGE_DRIVER || "local",
    });
  } catch (err: any) {
    console.error("[upload]", err);
    return jsonError(err?.message || "Upload thất bại (kiểm tra MinIO/STORAGE_DRIVER)", 500);
  }
}

function guessMime(ext: string) {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}
