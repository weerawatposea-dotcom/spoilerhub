/**
 * Fetch REAL spoiler content from web sources
 *
 * Sources:
 *   1. Jikan API (MyAnimeList) — manga reviews with real plot discussion
 *   2. AniList reviews — user-written reviews with real spoilers
 *
 * Usage:
 *   DATABASE_URL=xxx bun run src/scripts/fetch-real-spoilers.ts
 *   DATABASE_URL=xxx bun run src/scripts/fetch-real-spoilers.ts --limit=50
 */

import translate from "google-translate-api-x";
import { db } from "../db/index";
import { series, spoilers, users } from "../db/schema";
import { eq, sql, isNotNull } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// ─── Config ──────────────────────────────────────

const JIKAN_API = "https://api.jikan.moe/v4";
const ANILIST_API = "https://graphql.anilist.co";

const LIMIT = parseInt(
  process.argv.find((a) => a.startsWith("--limit"))?.split("=")[1] ?? "100"
);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .slice(0, 80);
}

async function translateToThai(text: string): Promise<string> {
  try {
    const result = await translate(text, { from: "en", to: "th" });
    return result.text;
  } catch {
    return text;
  }
}

// ─── Jikan API (MyAnimeList) ─────────────────────

interface JikanReview {
  mal_id: number;
  type: string;
  review: string;
  score: number;
  user: { username: string };
  is_spoiler: boolean;
  tags: string[];
}

async function searchJikanManga(title: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${JIKAN_API}/manga?q=${encodeURIComponent(title)}&limit=1&sfw=true`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.[0]?.mal_id ?? null;
  } catch {
    return null;
  }
}

async function getJikanReviews(malId: number): Promise<JikanReview[]> {
  try {
    const res = await fetch(`${JIKAN_API}/manga/${malId}/reviews?preliminary=true`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.data ?? []).filter(
      (r: JikanReview) => r.review && r.review.length > 100
    );
  } catch {
    return [];
  }
}

// ─── AniList Reviews ─────────────────────────────

const ANILIST_REVIEWS_QUERY = `
  query ($search: String) {
    Media(search: $search, type: MANGA) {
      id
      title { english romaji }
      reviews(limit: 5, sort: RATING_DESC) {
        nodes {
          id
          summary
          body(asHtml: false)
          score
          user { name }
        }
      }
    }
  }
`;

interface AniListReview {
  id: number;
  summary: string;
  body: string;
  score: number;
  user: { name: string };
}

async function getAniListReviews(title: string): Promise<AniListReview[]> {
  try {
    const res = await fetch(ANILIST_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: ANILIST_REVIEWS_QUERY,
        variables: { search: title },
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data?.Media?.reviews?.nodes ?? [];
  } catch {
    return [];
  }
}

// ─── Extract spoiler content from review ─────────

function extractSpoilerContent(
  reviewText: string,
  seriesTitle: string
): { title: string; content: string } | null {
  // Clean HTML/markdown
  let text = reviewText
    .replace(/<[^>]+>/g, "")
    .replace(/\*\*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (text.length < 100) return null;

  // Extract first 2-3 meaningful paragraphs as spoiler content
  const paragraphs = text
    .split(/\n\n+/)
    .filter((p) => p.trim().length > 30)
    .slice(0, 3);

  if (paragraphs.length === 0) return null;

  // Create a spoiler title from the first sentence
  const firstSentence = paragraphs[0].split(/[.!?]/)[0]?.trim();
  const title = firstSentence
    ? `${seriesTitle} — ${firstSentence.slice(0, 80)}`
    : `${seriesTitle} — Review & Discussion`;

  // Format content as markdown
  const content = `## ${seriesTitle} — Discussion & Analysis\n\n${paragraphs.join("\n\n")}\n\n---\n*Source: Community review*`;

  return { title, content: content.slice(0, 2000) };
}

// ─── Auto users ──────────────────────────────────

const AUTO_USERS = [
  "auto-user-0", "auto-user-1", "auto-user-2", "auto-user-3", "auto-user-4",
  "auto-user-5", "auto-user-6", "auto-user-7", "auto-user-8", "auto-user-9",
];

// ─── Main ────────────────────────────────────────

async function main() {
  console.log("[real-spoilers] Fetching real content from MAL + AniList...\n");

  // Ensure users exist
  const userNames = ["SpoilerFan", "MangaLover", "OtakuKing", "WebtoonAddict", "NovelReader",
    "AnimeExpert", "ManhwaFan88", "ChapterHunter", "PlotTwistKing", "SpoilMaster"];
  for (let i = 0; i < AUTO_USERS.length; i++) {
    await db.insert(users).values({
      id: AUTO_USERS[i], name: userNames[i],
      email: `${AUTO_USERS[i]}@spoilerhub.com`, role: "user",
    }).onConflictDoNothing();
  }

  // Get series that need more spoilers (< 5)
  const targetSeries = await db
    .select({
      id: series.id,
      title: series.title,
      slug: series.slug,
      type: series.type,
      status: series.status,
      existingSpoilers: sql<number>`(SELECT COUNT(*) FROM spoilers WHERE spoilers.series_id = series.id)`,
    })
    .from(series)
    .where(isNotNull(series.title))
    .orderBy(series.createdAt)
    .limit(LIMIT);

  const needMore = targetSeries.filter((s) => Number(s.existingSpoilers) < 7);
  console.log(`Found ${needMore.length} series that can use more spoilers\n`);

  let totalCreated = 0;
  let jikanHits = 0;
  let anilistHits = 0;

  for (let i = 0; i < needMore.length; i++) {
    const s = needMore[i];
    const progress = `[${i + 1}/${needMore.length}]`;
    console.log(`${progress} ${s.title}`);

    try {
      // Try Jikan (MAL) first
      await sleep(1200); // Jikan rate limit: 3 req/sec
      const malId = await searchJikanManga(s.title);

      if (malId) {
        await sleep(1200);
        const reviews = await getJikanReviews(malId);

        for (let j = 0; j < Math.min(reviews.length, 2); j++) {
          const review = reviews[j];
          const extracted = extractSpoilerContent(review.review, s.title);
          if (!extracted) continue;

          // Translate to Thai
          const thTitle = await translateToThai(extracted.title);
          await sleep(800);
          const thContent = await translateToThai(extracted.content);
          await sleep(800);

          const chapter = s.status === "ongoing"
            ? String(Math.floor(Math.random() * 50) + 150)
            : String(Math.floor(Math.random() * 80) + 30);

          await db.insert(spoilers).values({
            seriesId: s.id,
            authorId: AUTO_USERS[(i + j) % AUTO_USERS.length],
            title: thTitle,
            content: thContent,
            chapter,
            slug: `${s.slug}-ch-${chapter}-${createId().slice(0, 8)}`,
            upvoteCount: Math.floor(Math.random() * 600) + 50,
          });

          totalCreated++;
          jikanHits++;
        }

        if (reviews.length > 0) {
          console.log(`  → ${Math.min(reviews.length, 2)} from MAL`);
          continue;
        }
      }

      // Fallback: AniList reviews
      await sleep(1500);
      const aniReviews = await getAniListReviews(s.title);

      for (let j = 0; j < Math.min(aniReviews.length, 2); j++) {
        const review = aniReviews[j];
        const text = review.body || review.summary;
        const extracted = extractSpoilerContent(text, s.title);
        if (!extracted) continue;

        const thTitle = await translateToThai(extracted.title);
        await sleep(800);
        const thContent = await translateToThai(extracted.content);
        await sleep(800);

        const chapter = s.status === "ongoing"
          ? String(Math.floor(Math.random() * 50) + 150)
          : String(Math.floor(Math.random() * 80) + 30);

        await db.insert(spoilers).values({
          seriesId: s.id,
          authorId: AUTO_USERS[(i + j) % AUTO_USERS.length],
          title: thTitle,
          content: thContent,
          chapter,
          slug: `${s.slug}-ch-${chapter}-${createId().slice(0, 8)}`,
          upvoteCount: Math.floor(Math.random() * 600) + 50,
        });

        totalCreated++;
        anilistHits++;
      }

      if (aniReviews.length > 0) {
        console.log(`  → ${Math.min(aniReviews.length, 2)} from AniList`);
      } else {
        console.log(`  → No reviews found`);
      }
    } catch (err) {
      console.error(`  ✗ ${err instanceof Error ? err.message : err}`);
      await sleep(3000);
    }
  }

  console.log(`\n[real-spoilers] Done!`);
  console.log(`  Created: ${totalCreated}`);
  console.log(`  From MAL: ${jikanHits}`);
  console.log(`  From AniList: ${anilistHits}`);
  process.exit(0);
}

main();
