/**
 * MinIO (S3-compatible) Object Storage client
 *
 * Used to store cover images on our own Railway-hosted MinIO
 * instead of relying on external AniList CDN.
 *
 * Benefits:
 * - Faster LCP (same Railway region, no cross-origin)
 * - Control over caching headers
 * - Persistent storage (AniList URLs can change)
 */

import { Client } from "minio";

const BUCKET = "covers";

export const minio = new Client({
  endPoint: process.env.MINIO_ENDPOINT!,
  port: parseInt(process.env.MINIO_PORT ?? "443"),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
});

/**
 * Ensure the "covers" bucket exists with public read policy
 */
export async function ensureBucket() {
  const exists = await minio.bucketExists(BUCKET);
  if (!exists) {
    await minio.makeBucket(BUCKET);
    // Set public read policy so images can be served directly
    const policy = {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { AWS: ["*"] },
          Action: ["s3:GetObject"],
          Resource: [`arn:aws:s3:::${BUCKET}/*`],
        },
      ],
    };
    await minio.setBucketPolicy(BUCKET, JSON.stringify(policy));
    console.log(`[minio] Created bucket "${BUCKET}" with public read`);
  }
  return BUCKET;
}

/**
 * Upload a cover image from a URL to MinIO
 * Returns the public URL of the uploaded image
 *
 * @param seriesId - Series ID (used as filename)
 * @param sourceUrl - External image URL to download
 */
export async function uploadCoverFromUrl(
  seriesId: string,
  sourceUrl: string
): Promise<string> {
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error(`Failed to fetch: ${sourceUrl}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") ?? "image/jpeg";

  // Determine extension from content type
  const ext = contentType.includes("png")
    ? "png"
    : contentType.includes("webp")
      ? "webp"
      : "jpg";

  const objectName = `${seriesId}.${ext}`;

  await minio.putObject(BUCKET, objectName, buffer, buffer.length, {
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=31536000, immutable",
  });

  return getPublicUrl(objectName);
}

/**
 * Upload raw image buffer to MinIO
 */
export async function uploadCoverBuffer(
  seriesId: string,
  buffer: Buffer,
  contentType = "image/jpeg"
): Promise<string> {
  const ext = contentType.includes("png")
    ? "png"
    : contentType.includes("webp")
      ? "webp"
      : "jpg";

  const objectName = `${seriesId}.${ext}`;

  await minio.putObject(BUCKET, objectName, buffer, buffer.length, {
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=31536000, immutable",
  });

  return getPublicUrl(objectName);
}

/**
 * Generate a presigned URL for temporary access (7 days)
 */
export async function getPresignedUrl(objectName: string): Promise<string> {
  return minio.presignedGetObject(BUCKET, objectName, 7 * 24 * 60 * 60);
}

/**
 * Get the public URL for an object
 * Uses the public MinIO endpoint configured via NEXT_PUBLIC_MINIO_ENDPOINT
 */
export function getPublicUrl(objectName: string): string {
  const endpoint =
    process.env.NEXT_PUBLIC_MINIO_ENDPOINT ?? process.env.MINIO_ENDPOINT;
  return `https://${endpoint}/${BUCKET}/${objectName}`;
}

/**
 * Check if a cover image exists in MinIO
 */
export async function coverExists(seriesId: string): Promise<string | null> {
  for (const ext of ["jpg", "png", "webp"]) {
    try {
      await minio.statObject(BUCKET, `${seriesId}.${ext}`);
      return getPublicUrl(`${seriesId}.${ext}`);
    } catch {
      // Not found, try next extension
    }
  }
  return null;
}
