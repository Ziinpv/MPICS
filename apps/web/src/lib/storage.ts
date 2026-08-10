import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { mediaUrl as publicMediaUrl, normalizeStorageKey } from "@/lib/mediaUrl";

export type StorageDriver = "local" | "s3";

export { normalizeStorageKey, mediaUrl } from "@/lib/mediaUrl";

export function storageDriver(): StorageDriver {
  const d = (process.env.STORAGE_DRIVER || process.env.NEXT_PUBLIC_STORAGE_DRIVER || "local").toLowerCase();
  return d === "s3" ? "s3" : "local";
}

function s3Config() {
  const endpoint = process.env.S3_ENDPOINT || "http://127.0.0.1:9000";
  const region = process.env.S3_REGION || "us-east-1";
  const accessKeyId = process.env.S3_ACCESS_KEY || "mpcis";
  const secretAccessKey = process.env.S3_SECRET_KEY || "mpcisminio";
  const bucket = process.env.S3_BUCKET || "mpcis-media";
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE !== "0";
  return { endpoint, region, accessKeyId, secretAccessKey, bucket, forcePathStyle };
}

let s3Client: S3Client | null = null;
let bucketReady = false;

function getS3() {
  if (!s3Client) {
    const c = s3Config();
    s3Client = new S3Client({
      region: c.region,
      endpoint: c.endpoint,
      forcePathStyle: c.forcePathStyle,
      credentials: {
        accessKeyId: c.accessKeyId,
        secretAccessKey: c.secretAccessKey,
      },
    });
  }
  return s3Client;
}

async function ensureBucket() {
  if (bucketReady) return;
  const { bucket } = s3Config();
  const client = getS3();
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    try {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
    } catch (err: any) {
      if (!String(err?.name || err?.Code || "").includes("BucketAlready")) {
        throw err;
      }
    }
  }
  bucketReady = true;
}

export async function putMediaObject(input: {
  key: string;
  body: Buffer;
  contentType?: string;
}): Promise<{ storageKey: string; url: string }> {
  const key = normalizeStorageKey(input.key);

  if (storageDriver() === "s3") {
    await ensureBucket();
    const { bucket } = s3Config();
    await getS3().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: input.body,
        ContentType: input.contentType || "application/octet-stream",
      }),
    );
    return { storageKey: key, url: publicMediaUrl(key) };
  }

  const abs = path.join(process.cwd(), "public", key);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, input.body);
  return { storageKey: key, url: publicMediaUrl(key) };
}

export async function getMediaObject(
  storageKey: string,
): Promise<{ body: Buffer; contentType: string } | null> {
  const key = normalizeStorageKey(storageKey);

  if (storageDriver() === "s3") {
    await ensureBucket();
    const { bucket } = s3Config();
    try {
      const out = await getS3().send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
      );
      const bytes = await out.Body?.transformToByteArray();
      if (!bytes) return null;
      return {
        body: Buffer.from(bytes),
        contentType: out.ContentType || guessContentType(key),
      };
    } catch {
      return null;
    }
  }

  try {
    const abs = path.join(process.cwd(), "public", key);
    const body = await readFile(abs);
    return { body, contentType: guessContentType(key) };
  } catch {
    return null;
  }
}

function guessContentType(key: string) {
  const ext = key.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return "application/octet-stream";
}
