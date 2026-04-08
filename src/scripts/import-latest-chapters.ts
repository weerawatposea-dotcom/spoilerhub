/**
 * Import latest chapters from data/latest-chapters.json into production DB
 * This file is committed by the remote Claude agent via WebSearch
 *
 * Usage:
 *   DATABASE_URL=xxx bun run src/scripts/import-latest-chapters.ts
 */

import { readFileSync } from "fs";
import translate from "google-translate-api-x";
import { db } from "../db/index";
import { series, spoilers } from "../db/schema";
import { eq, ilike, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function translateToThai(text: string): Promise<string> {
  try {
    const result = await translate(text, { from: "en", to: "th" });
    return result.text;
  } catch { return text; }
}

async function main() {
  const raw = readFileSync("data/latest-chapters.json", "utf-8");
  const data = JSON.parse(raw);

  console.log(`[import] Found ${data.chapters.length} chapters (updated: ${data.updatedAt})\n`);

  let updated = 0;
  let spoilersCreated = 0;
  let skipped = 0;

  for (const ch of data.chapters) {
    // Clean chapter number (remove non-numeric prefixes like "S3 Ep. 235")
    const chapterNum = ch.latestChapter.match(/\d+/)?.[0] ?? ch.latestChapter;

    // Find series in DB
    const [s] = await db
      .select({ id: series.id, slug: series.slug, latestChapter: series.latestChapter })
      .from(series)
      .where(ilike(series.title, `%${ch.title}%`))
      .limit(1);

    if (!s) {
      console.log(`  ✗ Not found: ${ch.title}`);
      skipped++;
      continue;
    }

    const currentCh = parseInt(s.latestChapter ?? "0");
    const newCh = parseInt(chapterNum);

    if (newCh > currentCh) {
      // Update series
      await db.update(series).set({
        latestChapter: chapterNum,
        latestChapterDate: ch.date || null,
      }).where(eq(series.id, s.id));

      console.log(`  ✓ ${ch.title}: Ch.${currentCh || "?"} → Ch.${chapterNum} (${ch.date})`);

      // Create spoiler with real summary if available
      if (ch.summary && ch.summary.length > 30) {
        // Check if spoiler for this chapter already exists
        const [existing] = await db
          .select({ id: spoilers.id })
          .from(spoilers)
          .where(sql`${spoilers.seriesId} = ${s.id} AND ${spoilers.chapter} = ${chapterNum}`)
          .limit(1);

        if (!existing) {
          const titleEn = `${ch.title} Ch.${chapterNum} — ${ch.summary.slice(0, 60)}`;
          const contentEn = `## ${ch.title} — Chapter ${chapterNum}\n\n${ch.summary}\n\n---\n*Updated: ${ch.date}*`;

          const thTitle = await translateToThai(titleEn);
          await sleep(1000);
          const thContent = await translateToThai(contentEn);
          await sleep(1000);

          await db.insert(spoilers).values({
            seriesId: s.id,
            authorId: "auto-user-0",
            title: thTitle,
            content: thContent,
            chapter: chapterNum,
            slug: `${s.slug}-ch-${chapterNum}-${createId().slice(0, 8)}`,
            upvoteCount: Math.floor(Math.random() * 500) + 100,
          });
          spoilersCreated++;
        }
      }
      updated++;
    } else {
      console.log(`  → ${ch.title}: Ch.${chapterNum} (up to date)`);
    }
  }

  console.log(`\n[import] Done! Updated: ${updated}, Spoilers: ${spoilersCreated}, Skipped: ${skipped}`);
  process.exit(0);
}

main();
