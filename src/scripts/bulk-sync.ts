/**
 * Bulk sync — fetch MANY pages from AniList to populate DB with more content
 *
 * Usage:
 *   bun run src/scripts/bulk-sync.ts                   # local DB
 *   DATABASE_URL=xxx bun run src/scripts/bulk-sync.ts   # production DB
 *
 * Fetches: trending pages 1-5, popular pages 1-5, recently updated pages 1-3
 * Expected: ~300-500 unique series
 */

import {
  fetchTrending,
  fetchPopular,
  fetchRecentlyUpdated,
  type AniListMedia,
} from "../lib/anilist";
import { db } from "../db/index";
import { series, genres, seriesGenres } from "../db/schema";
import { eq } from "drizzle-orm";
import {
  mapToSeriesType,
  mapToStatus,
  cleanDescription,
} from "../lib/anilist";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .slice(0, 100);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function upsertSeries(media: AniListMedia): Promise<"added" | "updated" | "skipped"> {
  const title = media.title.english || media.title.romaji;
  const slug = slugify(title);
  if (!slug) return "skipped";

  const [existing] = await db
    .select({ id: series.id })
    .from(series)
    .where(eq(series.slug, slug))
    .limit(1);

  const data = {
    title,
    slug,
    type: mapToSeriesType(media),
    coverImage: media.coverImage.extraLarge || media.coverImage.large,
    synopsis: cleanDescription(media.description),
    status: mapToStatus(media.status),
  };

  if (existing) {
    await db.update(series).set(data).where(eq(series.id, existing.id));
    await syncGenres(existing.id, media.genres);
    return "updated";
  } else {
    const [newSeries] = await db.insert(series).values(data).returning();
    await syncGenres(newSeries.id, media.genres);
    return "added";
  }
}

async function syncGenres(seriesId: string, genreNames: string[]) {
  await db.delete(seriesGenres).where(eq(seriesGenres.seriesId, seriesId));
  for (const name of genreNames) {
    const genreSlug = slugify(name);
    if (!genreSlug) continue;
    let [genre] = await db.select().from(genres).where(eq(genres.slug, genreSlug)).limit(1);
    if (!genre) {
      [genre] = await db.insert(genres).values({ name, slug: genreSlug }).onConflictDoNothing().returning();
      if (!genre) {
        [genre] = await db.select().from(genres).where(eq(genres.slug, genreSlug)).limit(1);
      }
    }
    if (genre) {
      await db.insert(seriesGenres).values({ seriesId, genreId: genre.id }).onConflictDoNothing();
    }
  }
}

async function main() {
  const allMedia: AniListMedia[] = [];
  const seen = new Set<number>();

  function addUnique(items: AniListMedia[]) {
    for (const m of items) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        allMedia.push(m);
      }
    }
  }

  console.log("[bulk-sync] Fetching from AniList...\n");

  // Trending pages 1-5
  for (let page = 1; page <= 5; page++) {
    console.log(`  Trending page ${page}...`);
    addUnique(await fetchTrending(page, 50));
    await sleep(1500); // rate limit: 90 req/min
  }

  // Popular pages 1-5
  for (let page = 1; page <= 5; page++) {
    console.log(`  Popular page ${page}...`);
    addUnique(await fetchPopular(page, 50));
    await sleep(1500);
  }

  // Recently updated pages 1-3
  for (let page = 1; page <= 3; page++) {
    console.log(`  Recently updated page ${page}...`);
    addUnique(await fetchRecentlyUpdated(page, 50));
    await sleep(1500);
  }

  console.log(`\n[bulk-sync] Total unique series: ${allMedia.length}`);
  console.log("[bulk-sync] Upserting to DB...\n");

  let added = 0, updated = 0, skipped = 0, errors = 0;

  for (let i = 0; i < allMedia.length; i++) {
    const media = allMedia[i];
    const title = media.title.english || media.title.romaji;
    try {
      const result = await upsertSeries(media);
      if (result === "added") added++;
      else if (result === "updated") updated++;
      else skipped++;

      if ((i + 1) % 50 === 0) {
        console.log(`  Progress: ${i + 1}/${allMedia.length} (added: ${added}, updated: ${updated})`);
      }
    } catch (err) {
      errors++;
      if (errors <= 5) console.error(`  ✗ ${title}: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\n[bulk-sync] Done!`);
  console.log(`  Added: ${added}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Total in fetch: ${allMedia.length}`);

  process.exit(0);
}

main();
