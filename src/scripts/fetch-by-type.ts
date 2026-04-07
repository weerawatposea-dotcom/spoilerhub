/**
 * Fetch series from AniList by specific criteria
 *
 * Usage:
 *   DATABASE_URL=xxx bun run src/scripts/fetch-by-type.ts --type=manhua --pages=5
 *   DATABASE_URL=xxx bun run src/scripts/fetch-by-type.ts --type=novel --pages=5
 *   DATABASE_URL=xxx bun run src/scripts/fetch-by-type.ts --type=anime --pages=5
 *   DATABASE_URL=xxx bun run src/scripts/fetch-by-type.ts --type=manhwa-extra --pages=5
 *   DATABASE_URL=xxx bun run src/scripts/fetch-by-type.ts --type=manga-extra --pages=5
 */

import { db } from "../db/index";
import { series, genres, seriesGenres } from "../db/schema";
import { eq } from "drizzle-orm";
import { mapToSeriesType, mapToStatus, cleanDescription, type AniListMedia } from "../lib/anilist";

const ANILIST_API = "https://graphql.anilist.co";

const args = Object.fromEntries(
  process.argv.filter((a) => a.startsWith("--")).map((a) => {
    const [k, v] = a.replace("--", "").split("=");
    return [k, v ?? "true"];
  })
);

const TYPE = args.type ?? "manhua";
const PAGES = parseInt(args.pages ?? "5");

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim().slice(0, 100);
}

// Different queries for different types
function getQueryForType(type: string) {
  switch (type) {
    case "manhua":
      return {
        query: `query ($page: Int, $perPage: Int) {
          Page(page: $page, perPage: $perPage) {
            pageInfo { hasNextPage }
            media(type: MANGA, countryOfOrigin: CN, sort: POPULARITY_DESC, isAdult: false) {
              id title { romaji english } coverImage { extraLarge large }
              description(asHtml: false) chapters status genres format countryOfOrigin trending popularity
            }
          }
        }`,
        label: "Chinese Manhua",
      };
    case "novel":
      return {
        query: `query ($page: Int, $perPage: Int) {
          Page(page: $page, perPage: $perPage) {
            pageInfo { hasNextPage }
            media(type: MANGA, format: NOVEL, sort: POPULARITY_DESC, isAdult: false) {
              id title { romaji english } coverImage { extraLarge large }
              description(asHtml: false) chapters status genres format countryOfOrigin trending popularity
            }
          }
        }`,
        label: "Light Novels",
      };
    case "anime":
      return {
        query: `query ($page: Int, $perPage: Int) {
          Page(page: $page, perPage: $perPage) {
            pageInfo { hasNextPage }
            media(type: ANIME, sort: POPULARITY_DESC, isAdult: false, format_in: [TV, TV_SHORT, MOVIE, ONA]) {
              id title { romaji english } coverImage { extraLarge large }
              description(asHtml: false) episodes status genres format countryOfOrigin trending popularity
            }
          }
        }`,
        label: "Anime",
      };
    case "manhwa-extra":
      return {
        query: `query ($page: Int, $perPage: Int) {
          Page(page: $page, perPage: $perPage) {
            pageInfo { hasNextPage }
            media(type: MANGA, countryOfOrigin: KR, sort: POPULARITY_DESC, isAdult: false) {
              id title { romaji english } coverImage { extraLarge large }
              description(asHtml: false) chapters status genres format countryOfOrigin trending popularity
            }
          }
        }`,
        label: "Korean Manhwa (extra)",
      };
    case "manga-extra":
      return {
        query: `query ($page: Int, $perPage: Int) {
          Page(page: $page, perPage: $perPage) {
            pageInfo { hasNextPage }
            media(type: MANGA, countryOfOrigin: JP, sort: TRENDING_DESC, isAdult: false) {
              id title { romaji english } coverImage { extraLarge large }
              description(asHtml: false) chapters status genres format countryOfOrigin trending popularity
            }
          }
        }`,
        label: "Trending Manga (extra)",
      };
    default:
      throw new Error(`Unknown type: ${type}`);
  }
}

async function upsertSeries(media: AniListMedia & { episodes?: number }): Promise<"added" | "updated" | "skipped"> {
  const title = media.title.english || media.title.romaji;
  const slug = slugify(title);
  if (!slug) return "skipped";

  const [existing] = await db.select({ id: series.id }).from(series).where(eq(series.slug, slug)).limit(1);

  // For anime, override type
  const seriesType = TYPE === "anime" ? "anime" as const : mapToSeriesType(media);

  const data = {
    title, slug, type: seriesType,
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
    const gSlug = slugify(name);
    if (!gSlug) continue;
    let [genre] = await db.select().from(genres).where(eq(genres.slug, gSlug)).limit(1);
    if (!genre) {
      [genre] = await db.insert(genres).values({ name, slug: gSlug }).onConflictDoNothing().returning();
      if (!genre) [genre] = await db.select().from(genres).where(eq(genres.slug, gSlug)).limit(1);
    }
    if (genre) await db.insert(seriesGenres).values({ seriesId, genreId: genre.id }).onConflictDoNothing();
  }
}

async function main() {
  const { query, label } = getQueryForType(TYPE);
  console.log(`[fetch-${TYPE}] Fetching ${label} from AniList (${PAGES} pages)...\n`);

  const seen = new Set<number>();
  const allMedia: AniListMedia[] = [];

  for (let page = 1; page <= PAGES; page++) {
    console.log(`  Page ${page}/${PAGES}...`);
    const res = await fetch(ANILIST_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { page, perPage: 50 } }),
    });
    if (!res.ok) { console.error(`  API error: ${res.status}`); continue; }
    const data = await res.json();
    const media = data?.data?.Page?.media ?? [];
    for (const m of media) {
      if (!seen.has(m.id)) { seen.add(m.id); allMedia.push(m); }
    }
    await sleep(1500);
  }

  console.log(`\n[fetch-${TYPE}] Found ${allMedia.length} unique ${label}. Upserting...\n`);

  let added = 0, updated = 0, skipped = 0;
  for (const media of allMedia) {
    try {
      const result = await upsertSeries(media);
      if (result === "added") added++;
      else if (result === "updated") updated++;
      else skipped++;
    } catch (err) {
      skipped++;
    }
  }

  console.log(`\n[fetch-${TYPE}] Done! Added: ${added}, Updated: ${updated}, Skipped: ${skipped}`);
  process.exit(0);
}

main();
