/**
 * Update latest chapter numbers for series using web search
 *
 * Strategy: Search "{title} latest chapter" → extract chapter number from results
 * Then generate a fresh spoiler for the latest chapter
 *
 * Usage:
 *   DATABASE_URL=xxx bun run src/scripts/update-latest-chapters.ts
 *   DATABASE_URL=xxx bun run src/scripts/update-latest-chapters.ts --limit=50
 */

import translate from "google-translate-api-x";
import { db } from "../db/index";
import { series, spoilers, users } from "../db/schema";
import { eq, desc, isNull, or, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

const LIMIT = parseInt(
  process.argv.find((a) => a.startsWith("--limit"))?.split("=")[1] ?? "100"
);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim().slice(0, 80);
}

async function translateToThai(text: string): Promise<string> {
  try {
    const result = await translate(text, { from: "en", to: "th" });
    return result.text;
  } catch { return text; }
}

// ─── Jikan API for latest chapter ────────────────

async function getLatestChapterFromJikan(title: string): Promise<{ chapter: string; date: string } | null> {
  try {
    // Search manga
    const searchRes = await fetch(
      `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(title)}&limit=1&sfw=true`
    );
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const manga = searchData?.data?.[0];
    if (!manga) return null;

    // Jikan has chapters for completed manga
    if (manga.chapters) {
      return { chapter: String(manga.chapters), date: "" };
    }

    // For ongoing, check news/updates
    await sleep(1200);
    const newsRes = await fetch(
      `https://api.jikan.moe/v4/manga/${manga.mal_id}/news?limit=3`
    );
    if (!newsRes.ok) return null;
    const newsData = await newsRes.json();

    // Try to extract chapter number from news titles
    for (const news of newsData?.data ?? []) {
      const title = news.title || "";
      const match = title.match(/chapter\s*(\d+)/i) || title.match(/ch\.?\s*(\d+)/i);
      if (match) {
        return { chapter: match[1], date: news.date?.slice(0, 10) ?? "" };
      }
    }

    return null;
  } catch {
    return null;
  }
}

// ─── MangaDex API for latest chapter ─────────────

async function getLatestChapterFromMangaDex(title: string): Promise<{ chapter: string; date: string } | null> {
  try {
    // Search manga
    const searchRes = await fetch(
      `https://api.mangadex.org/manga?title=${encodeURIComponent(title)}&limit=1`
    );
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const manga = searchData?.data?.[0];
    if (!manga) return null;

    // Get latest chapter from feed
    await sleep(500);
    const feedRes = await fetch(
      `https://api.mangadex.org/manga/${manga.id}/feed?limit=1&order[chapter]=desc&translatedLanguage[]=en`
    );
    if (!feedRes.ok) return null;
    const feedData = await feedRes.json();
    const ch = feedData?.data?.[0];
    if (!ch) return null;

    const chapterNum = ch.attributes?.chapter;
    const date = ch.attributes?.readableAt?.slice(0, 10) ?? "";

    if (chapterNum) {
      return { chapter: chapterNum, date };
    }

    return null;
  } catch {
    return null;
  }
}

// ─── Auto users ──────────────────────────────────

const AUTO_USERS = [
  "auto-user-0", "auto-user-1", "auto-user-2", "auto-user-3", "auto-user-4",
  "auto-user-5", "auto-user-6", "auto-user-7", "auto-user-8", "auto-user-9",
];

// ─── Generate spoiler for latest chapter ─────────

async function generateLatestSpoiler(
  s: { id: string; title: string; slug: string; synopsis: string | null },
  chapter: string,
  index: number
) {
  // Check if spoiler for this chapter already exists
  const [existing] = await db
    .select({ id: spoilers.id })
    .from(spoilers)
    .where(
      sql`${spoilers.seriesId} = ${s.id} AND ${spoilers.chapter} = ${chapter}`
    )
    .limit(1);

  if (existing) return false;

  const synopsis = s.synopsis ?? "An exciting new chapter continues the story.";
  const firstLine = synopsis.split(/[.!?]/)[0]?.trim() ?? "The story continues";

  const titleEn = `${s.title} Chapter ${chapter} — Latest Release!`;
  const contentEn = `## ${s.title} — Chapter ${chapter} (Latest)\n\n${firstLine}. This latest chapter brings major developments to the story.\n\n### Key Moments\n- A crucial revelation changes the direction of the plot\n- Character dynamics shift with new alliances forming\n- The action reaches a new peak with an intense sequence\n- Seeds are planted for what comes next\n\n### Community Buzz\nFans are discussing this chapter heavily. The pacing and art quality continue to impress, making this one of the most anticipated releases each week.\n\n### Rating: ★★★★☆\nAnother strong chapter that keeps the momentum going.`;

  const thTitle = await translateToThai(titleEn);
  await sleep(800);
  const thContent = await translateToThai(contentEn);
  await sleep(800);

  const shortId = createId().slice(0, 8);
  const userId = AUTO_USERS[index % AUTO_USERS.length];

  await db.insert(spoilers).values({
    seriesId: s.id,
    authorId: userId,
    title: thTitle,
    content: thContent,
    chapter,
    slug: `${s.slug}-ch-${chapter}-${shortId}`,
    upvoteCount: Math.floor(Math.random() * 500) + 100,
  });

  return true;
}

// ─── Main ────────────────────────────────────────

async function main() {
  console.log("[update-chapters] Fetching latest chapter numbers...\n");

  // Ensure users exist
  for (let i = 0; i < AUTO_USERS.length; i++) {
    await db.insert(users).values({
      id: AUTO_USERS[i],
      name: ["SpoilerFan", "MangaLover", "OtakuKing", "WebtoonAddict", "NovelReader",
        "AnimeExpert", "ManhwaFan88", "ChapterHunter", "PlotTwistKing", "SpoilMaster"][i],
      email: `${AUTO_USERS[i]}@spoilerhub.com`,
      role: "user",
    }).onConflictDoNothing();
  }

  // Get ongoing series (prioritize those without latest_chapter)
  const targetSeries = await db
    .select({
      id: series.id,
      title: series.title,
      slug: series.slug,
      type: series.type,
      synopsis: series.synopsis,
      latestChapter: series.latestChapter,
    })
    .from(series)
    .where(eq(series.status, "ongoing"))
    .orderBy(
      sql`CASE WHEN ${series.latestChapter} IS NULL THEN 0 ELSE 1 END`,
      desc(series.createdAt)
    )
    .limit(LIMIT);

  console.log(`Found ${targetSeries.length} ongoing series to check\n`);

  let updated = 0;
  let spoilersCreated = 0;
  let noData = 0;

  for (let i = 0; i < targetSeries.length; i++) {
    const s = targetSeries[i];
    const progress = `[${i + 1}/${targetSeries.length}]`;

    // Skip non-manga/manhwa types for chapter lookup
    if (!["manga", "manhwa", "manhua"].includes(s.type)) {
      continue;
    }

    try {
      // Try MangaDex first (better for latest chapters)
      await sleep(1000);
      let result = await getLatestChapterFromMangaDex(s.title);

      // Fallback to Jikan
      if (!result) {
        await sleep(1200);
        result = await getLatestChapterFromJikan(s.title);
      }

      if (result && result.chapter) {
        const oldChapter = s.latestChapter;
        const isNew = !oldChapter || parseInt(result.chapter) > parseInt(oldChapter);

        // Update series with latest chapter
        await db.update(series).set({
          latestChapter: result.chapter,
          latestChapterDate: result.date || null,
        }).where(eq(series.id, s.id));

        if (isNew) {
          console.log(`${progress} ${s.title}: Ch.${result.chapter} ${result.date ? `(${result.date})` : ""} ← NEW`);

          // Generate spoiler for latest chapter
          const created = await generateLatestSpoiler(s, result.chapter, i);
          if (created) spoilersCreated++;
          updated++;
        } else {
          console.log(`${progress} ${s.title}: Ch.${result.chapter} (same)`);
        }
      } else {
        noData++;
      }
    } catch (err) {
      console.error(`${progress} ✗ ${s.title}: ${err instanceof Error ? err.message : err}`);
      await sleep(3000);
    }
  }

  console.log(`\n[update-chapters] Done!`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Spoilers created: ${spoilersCreated}`);
  console.log(`  No data: ${noData}`);
  process.exit(0);
}

main();
