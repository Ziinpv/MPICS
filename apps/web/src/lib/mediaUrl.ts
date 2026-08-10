/** Client-safe: map storageKey → URL hiển thị ảnh */

export function normalizeStorageKey(key: string) {
  return key.replace(/^\/+/, "");
}

/**
 * URL dùng trên UI / img src.
 * - local: /uploads/...
 * - s3 (hoặc khi cần proxy): /api/media/raw?key=...
 *
 * NEXT_PUBLIC_STORAGE_DRIVER=s3 → luôn dùng proxy (cookie auth).
 */
export function mediaUrl(storageKey: string | null | undefined): string {
  if (!storageKey) return "";
  if (storageKey.startsWith("http://") || storageKey.startsWith("https://")) {
    return storageKey;
  }
  const key = normalizeStorageKey(storageKey);
  const driver = (process.env.NEXT_PUBLIC_STORAGE_DRIVER || "local").toLowerCase();
  if (driver === "s3") {
    return `/api/media/raw?key=${encodeURIComponent(key)}`;
  }
  return `/${key}`;
}

/** Preview audio/media qua API (cookie auth + Content-Type đúng) — dùng cho TTS nghe thử */
export function mediaPreviewUrl(storageKey: string | null | undefined): string {
  if (!storageKey) return "";
  if (storageKey.startsWith("http://") || storageKey.startsWith("https://")) {
    return storageKey;
  }
  return `/api/media/raw?key=${encodeURIComponent(normalizeStorageKey(storageKey))}`;
}

