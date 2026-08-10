import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getMediaObject, normalizeStorageKey } from "@/lib/storage";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    return new Response(JSON.stringify({ error: "Thiếu key" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const normalized = normalizeStorageKey(key);
  if (normalized.includes("..") || normalized.startsWith("\\")) {
    return new Response(JSON.stringify({ error: "Key không hợp lệ" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const obj = await getMediaObject(normalized);
  if (!obj) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(new Uint8Array(obj.body), {
    status: 200,
    headers: {
      "Content-Type": obj.contentType || "application/octet-stream",
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `inline; filename="${normalized.split("/").pop() || "media"}"`,
    },
  });
}
