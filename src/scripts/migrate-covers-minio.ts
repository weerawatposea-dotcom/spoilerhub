/**
 * Migrate cover images from external URLs (AniList CDN) to our MinIO storage
 *
 * Usage:
 *   MINIO_ENDPOINT=... MINIO_ACCESS_KEY=... MINIO_SECRET_KEY=... \
 *   DATABASE_URL=... bun run src/scripts/migrate-covers-minio.ts [--limit=50]
 *
 * What it does:
 *   1. Fetches all series with external cover_image URLs
 *   2. Downloads each image
 *   3. Uploads to MinIO "covers" bucket
 *   4. Updates DB with new MinIO URL
 */

import { db } from "../db";
import { series } from "../db/schema";
import { isNotNull, not, like, eq } from "drizzle-orm";
import { ensureBucket, uploadCoverFromUrl, coverExists } from "../lib/minio";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1]) : 100;

  console.log("[migrate] Ensuring bucket exists...");
  await ensureBucket();

  const minioEndpoint =
    process.env.NEXT_PUBLIC_MINIO_ENDPOINT ?? process.env.MINIO_ENDPOINT;

  // Get series with external cover URLs (not already on MinIO)
  const toMigrate = await db
    .select({
      id: series.id,
      title: series.title,
      coverImage: series.coverImage,
    })
    .from(series)
    .where(
      isNotNull(series.coverImage)
    )
    .limit(limit);

  // Filter to only external URLs (not already on our MinIO)
  const external = toMigrate.filter(
    (s) => s.coverImage && !s.coverImage.includes(minioEndpoint!)
  );

  console.log(
    `[migrate] Found ${external.length} series with external covers (limit: ${limit})\n`
  );

  let uploaded = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < external.length; i++) {
    const s = external[i];
    const progress = `[${i + 1}/${external.length}]`;

    try {
      // Check if already exists in MinIO
      const existing = await coverExists(s.id);
      if (existing) {
        // Already uploaded — just update DB URL
        await db
          .update(series)
          .set({ coverImage: existing })
          .where(eq(series.id, s.id));
        console.log(`${progress} ⏩ ${s.title} (already in MinIO)`);
        skipped++;
        continue;
      }

      // Download + upload
      const newUrl = await uploadCoverFromUrl(s.id, s.coverImage!);

      // Update DB
      await db
        .update(series)
        .set({ coverImage: newUrl })
        .where(eq(series.id, s.id));

      console.log(`${progress} ✓ ${s.title}`);
      uploaded++;

      // Rate limit: 50ms between uploads
      await sleep(50);
    } catch (e: any) {
      console.log(`${progress} ✗ ${s.title} — ${e.message}`);
      errors++;
    }
  }

  console.log(
    `\n[migrate] Done! Uploaded: ${uploaded}, Skipped: ${skipped}, Errors: ${errors}`
  );
  process.exit(0);
}

main();
