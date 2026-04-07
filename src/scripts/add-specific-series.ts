/**
 * Search and add specific series from AniList by name
 *
 * Usage:
 *   DATABASE_URL=xxx bun run src/scripts/add-specific-series.ts
 */

import { db } from "../db/index";
import { series, genres, seriesGenres } from "../db/schema";
import { eq } from "drizzle-orm";
import { mapToSeriesType, mapToStatus, cleanDescription, type AniListMedia } from "../lib/anilist";

const ANILIST_API = "https://graphql.anilist.co";

const SEARCH_QUERY = `
  query ($search: String, $type: MediaType) {
    Media(search: $search, type: $type, isAdult: false) {
      id
      title { romaji english native }
      coverImage { extraLarge large }
      description(asHtml: false)
      chapters
      status
      genres
      format
      countryOfOrigin
      trending
      popularity
    }
  }
`;

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim().slice(0, 100);
}

async function searchAndAdd(searchTerm: string, type: "MANGA" | "ANIME" = "MANGA") {
  const res = await fetch(ANILIST_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: SEARCH_QUERY, variables: { search: searchTerm, type } }),
  });

  if (!res.ok) {
    console.log(`  ✗ AniList API error for "${searchTerm}": ${res.status}`);
    return null;
  }

  const data = await res.json();
  const media = data?.data?.Media as AniListMedia | null;
  if (!media) {
    console.log(`  ✗ Not found on AniList: "${searchTerm}"`);
    return null;
  }

  const title = media.title.english || media.title.romaji;
  const slug = slugify(title);

  // Check if already exists
  const [existing] = await db.select({ id: series.id }).from(series).where(eq(series.slug, slug)).limit(1);
  if (existing) {
    console.log(`  → Already exists: ${title}`);
    return existing.id;
  }

  // Insert series
  const [newSeries] = await db.insert(series).values({
    title,
    slug,
    type: mapToSeriesType(media),
    coverImage: media.coverImage.extraLarge || media.coverImage.large,
    synopsis: cleanDescription(media.description),
    status: mapToStatus(media.status),
  }).returning();

  // Add genres
  for (const name of media.genres) {
    const gSlug = slugify(name);
    let [genre] = await db.select().from(genres).where(eq(genres.slug, gSlug)).limit(1);
    if (!genre) {
      [genre] = await db.insert(genres).values({ name, slug: gSlug }).onConflictDoNothing().returning();
      if (!genre) [genre] = await db.select().from(genres).where(eq(genres.slug, gSlug)).limit(1);
    }
    if (genre) {
      await db.insert(seriesGenres).values({ seriesId: newSeries.id, genreId: genre.id }).onConflictDoNothing();
    }
  }

  console.log(`  ✓ Added: ${title} (${mapToSeriesType(media)})`);
  return newSeries.id;
}

// Series to add — from April 2026 trend research
const SERIES_TO_ADD = [
  { search: "Re:Zero", type: "MANGA" as const },
  { search: "Akane-banashi", type: "MANGA" as const },
  { search: "Return of the Mount Hua Sect", type: "MANGA" as const },
  { search: "SSS-Class Suicide Hunter", type: "MANGA" as const },
  { search: "Kindergarten Wars", type: "MANGA" as const },
  { search: "Fist of the North Star", type: "MANGA" as const },
  { search: "Witch Hat Atelier", type: "MANGA" as const },
  { search: "Oshi no Ko", type: "MANGA" as const },
  { search: "Gachiakuta", type: "MANGA" as const },
  { search: "Mashle", type: "MANGA" as const },
  { search: "Undead Unluck", type: "MANGA" as const },
  { search: "Ao no Hako", type: "MANGA" as const },
  { search: "Roaming the Apocalypse with My Shiba Inu", type: "MANGA" as const },
  { search: "Choujin X", type: "MANGA" as const },
  { search: "Ayashimon", type: "MANGA" as const },
  { search: "Lazy Dungeon Master", type: "MANGA" as const },
  { search: "The Remarried Empress", type: "MANGA" as const },
  { search: "Hardcore Leveling Warrior", type: "MANGA" as const },
  { search: "Lookism", type: "MANGA" as const },
  { search: "Weak Hero", type: "MANGA" as const },
];

async function main() {
  console.log("[add-series] Adding specific trending series...\n");

  let added = 0;
  for (const s of SERIES_TO_ADD) {
    console.log(`Searching: ${s.search}`);
    const id = await searchAndAdd(s.search, s.type);
    if (id) added++;
    await new Promise((r) => setTimeout(r, 1500)); // rate limit
  }

  console.log(`\n[add-series] Done! Added ${added} new series`);
  process.exit(0);
}

main();
