/**
 * AniList → SpoilerHub Sync Service
 *
 * Fetches trending + recently updated series from AniList
 * and upserts them into our PostgreSQL database.
 * Designed to run every 6 hours via cron.
 */

import { db } from "@/db";
import { series, genres, seriesGenres } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  fetchTrending,
  fetchRecentlyUpdated,
  fetchPopular,
  mapToSeriesType,
  mapToStatus,
  cleanDescription,
  type AniListMedia,
} from "./anilist";
import { uploadCoverFromUrl, coverExists } from "./minio";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .slice(0, 100);
}

interface SyncResult {
  added: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/**
 * Upsert a single series from AniList media data
 */
async function upsertSeries(media: AniListMedia): Promise<"added" | "updated" | "skipped"> {
  const title = media.title.english || media.title.romaji;
  const slug = slugify(title);

  if (!slug) return "skipped";

  // Skip completed series — we only want ongoing content
  if (mapToStatus(media.status) === "completed") return "skipped";

  // Check if already exists
  const [existing] = await db
    .select({ id: series.id })
    .from(series)
    .where(eq(series.slug, slug))
    .limit(1);

  const externalCover = media.coverImage.extraLarge || media.coverImage.large;

  const data = {
    title,
    slug,
    type: mapToSeriesType(media),
    coverImage: externalCover,
    synopsis: cleanDescription(media.description),
    status: mapToStatus(media.status),
  };

  if (existing) {
    // Update existing series (don't overwrite MinIO cover with external URL)
    const { coverImage: _, ...updateData } = data;
    await db.update(series).set(updateData).where(eq(series.id, existing.id));

    // Upload cover to MinIO if not already there
    if (externalCover && process.env.MINIO_ENDPOINT) {
      try {
        const existingCover = await coverExists(existing.id);
        if (!existingCover) {
          const minioUrl = await uploadCoverFromUrl(existing.id, externalCover);
          await db.update(series).set({ coverImage: minioUrl }).where(eq(series.id, existing.id));
        }
      } catch { /* MinIO optional — don't fail sync */ }
    }

    await syncGenres(existing.id, media.genres);
    return "updated";
  } else {
    // Insert new series
    const [newSeries] = await db.insert(series).values(data).returning();

    // Upload cover to MinIO
    if (externalCover && process.env.MINIO_ENDPOINT) {
      try {
        const minioUrl = await uploadCoverFromUrl(newSeries.id, externalCover);
        await db.update(series).set({ coverImage: minioUrl }).where(eq(series.id, newSeries.id));
      } catch { /* MinIO optional */ }
    }

    await syncGenres(newSeries.id, media.genres);
    return "added";
  }
}

/**
 * Sync genre associations for a series
 */
async function syncGenres(seriesId: string, genreNames: string[]) {
  // Delete existing genre links
  await db.delete(seriesGenres).where(eq(seriesGenres.seriesId, seriesId));

  for (const name of genreNames) {
    const genreSlug = slugify(name);
    if (!genreSlug) continue;

    // Upsert genre
    let [genre] = await db
      .select()
      .from(genres)
      .where(eq(genres.slug, genreSlug))
      .limit(1);

    if (!genre) {
      [genre] = await db
        .insert(genres)
        .values({ name, slug: genreSlug })
        .onConflictDoNothing()
        .returning();

      // If onConflictDoNothing returned nothing, fetch it
      if (!genre) {
        [genre] = await db
          .select()
          .from(genres)
          .where(eq(genres.slug, genreSlug))
          .limit(1);
      }
    }

    if (genre) {
      await db
        .insert(seriesGenres)
        .values({ seriesId, genreId: genre.id })
        .onConflictDoNothing();
    }
  }
}

/**
 * Run full sync — fetch from AniList and upsert everything
 */
export async function runSync(
  mode: "full" | "update" = "update"
): Promise<SyncResult> {
  const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] };

  try {
    let allMedia: AniListMedia[] = [];

    if (mode === "full") {
      // Full sync: trending + popular (initial seed)
      console.log("[sync] Full sync — fetching trending + popular...");
      const [trending, popular] = await Promise.all([
        fetchTrending(1, 50),
        fetchPopular(1, 50),
      ]);
      // Deduplicate by ID
      const seen = new Set<number>();
      for (const m of [...trending, ...popular]) {
        if (!seen.has(m.id)) {
          seen.add(m.id);
          allMedia.push(m);
        }
      }
    } else {
      // Update sync: recently updated + trending top 25
      console.log("[sync] Update sync — fetching recent + trending...");
      const [recent, trending] = await Promise.all([
        fetchRecentlyUpdated(1, 50),
        fetchTrending(1, 25),
      ]);
      const seen = new Set<number>();
      for (const m of [...recent, ...trending]) {
        if (!seen.has(m.id)) {
          seen.add(m.id);
          allMedia.push(m);
        }
      }
    }

    console.log(`[sync] Processing ${allMedia.length} series...`);

    for (const media of allMedia) {
      try {
        const status = await upsertSeries(media);
        result[status]++;
      } catch (err) {
        const title = media.title.english || media.title.romaji;
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`${title}: ${msg}`);
        result.skipped++;
      }
    }

    console.log(
      `[sync] Done! Added: ${result.added}, Updated: ${result.updated}, Skipped: ${result.skipped}, Errors: ${result.errors.length}`
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Fatal: ${msg}`);
    console.error("[sync] Fatal error:", msg);
  }

  return result;
}
