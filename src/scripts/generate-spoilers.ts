/**
 * Generate spoiler summaries for series using Google Translate
 * Then upload to production DB
 *
 * Usage:
 *   bun run src/scripts/generate-spoilers.ts                    # local DB
 *   DATABASE_URL=xxx bun run src/scripts/generate-spoilers.ts   # production DB
 *   bun run src/scripts/generate-spoilers.ts --limit 20         # limit count
 *
 * Flow:
 *   1. Find series that have 0 spoilers
 *   2. Generate a realistic spoiler summary (template-based)
 *   3. Translate to Thai via Google Translate
 *   4. Insert as spoiler with random upvotes + chapter
 */

import translate from "google-translate-api-x";
import { db } from "../db/index";
import { series, spoilers, users } from "../db/schema";
import { eq, sql, notInArray } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

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

// Spoiler summary templates by genre/type
const SPOILER_TEMPLATES = [
  (title: string, ch: number) =>
    `In chapter ${ch}, the protagonist faces their greatest challenge yet. A major betrayal is revealed, and the power balance shifts dramatically. A new ally appears unexpectedly.`,
  (title: string, ch: number) =>
    `Chapter ${ch} reveals a shocking plot twist! The main villain's true identity is finally exposed. An epic battle sequence unfolds with stunning consequences for the entire world.`,
  (title: string, ch: number) =>
    `The latest chapter ${ch} brings emotional moments as two rivals finally team up. A beloved character makes a sacrifice that changes everything. The story enters its climax arc.`,
  (title: string, ch: number) =>
    `Chapter ${ch} is an action-packed episode! The protagonist unlocks a new power-up during a desperate fight. Meanwhile, a side character's backstory is finally revealed.`,
  (title: string, ch: number) =>
    `In chapter ${ch}, the mystery deepens as a hidden connection between the main characters is discovered. The political intrigue reaches a boiling point with alliances breaking apart.`,
  (title: string, ch: number) =>
    `Chapter ${ch} delivers a major confrontation between the two strongest characters. The aftermath reshapes the power structure. A time skip is hinted at for the next arc.`,
  (title: string, ch: number) =>
    `The new chapter ${ch} starts a brand new arc! The setting changes dramatically as characters travel to an unexplored region. New enemies and potential allies are introduced.`,
  (title: string, ch: number) =>
    `Chapter ${ch} is a tearjerker! A long-running character arc finally reaches its emotional conclusion. Fans are calling this one of the best chapters in the series.`,
];

const TITLE_TEMPLATES = [
  (title: string, ch: number) => `${title} Ch.${ch} — Major Plot Twist Revealed!`,
  (title: string, ch: number) => `${title} Ch.${ch} — Epic Battle Unfolds!`,
  (title: string, ch: number) => `${title} Ch.${ch} — Shocking Betrayal!`,
  (title: string, ch: number) => `${title} Ch.${ch} — New Arc Begins!`,
  (title: string, ch: number) => `${title} Ch.${ch} — Emotional Finale!`,
  (title: string, ch: number) => `${title} Ch.${ch} — Power-Up Unlocked!`,
  (title: string, ch: number) => `${title} Ch.${ch} — Allies Unite!`,
  (title: string, ch: number) => `${title} Ch.${ch} — The Truth Exposed!`,
];

async function translateToThai(text: string): Promise<string> {
  try {
    const result = await translate(text, { from: "en", to: "th" });
    return result.text;
  } catch {
    return text; // fallback to English
  }
}

async function main() {
  const limitArg = process.argv.find((a) => a.startsWith("--limit"));
  const limit = limitArg ? parseInt(limitArg.split("=")[1] || "50") : 50;

  // Ensure test user exists
  const [testUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, "test-user-prod"))
    .limit(1);

  if (!testUser) {
    await db.insert(users).values({
      id: "test-user-prod",
      name: "SpoilerFan",
      email: "fan@spoilerhub.com",
      role: "user",
    });
  }

  // Find series with 0 spoilers
  const seriesWithSpoilers = await db
    .select({ seriesId: spoilers.seriesId })
    .from(spoilers);
  const idsWithSpoilers = seriesWithSpoilers.map((s) => s.seriesId);

  let targetSeries;
  if (idsWithSpoilers.length > 0) {
    targetSeries = await db
      .select()
      .from(series)
      .where(notInArray(series.id, idsWithSpoilers))
      .limit(limit);
  } else {
    targetSeries = await db.select().from(series).limit(limit);
  }

  console.log(`[generate] Found ${targetSeries.length} series without spoilers\n`);

  let created = 0;
  let failed = 0;

  for (let i = 0; i < targetSeries.length; i++) {
    const s = targetSeries[i];
    const progress = `[${i + 1}/${targetSeries.length}]`;

    try {
      // Random chapter number based on status
      const chapter = s.status === "ongoing"
        ? Math.floor(Math.random() * 50) + 150
        : Math.floor(Math.random() * 100) + 50;

      // Pick random templates
      const templateIdx = i % SPOILER_TEMPLATES.length;
      const titleTemplate = TITLE_TEMPLATES[templateIdx];
      const contentTemplate = SPOILER_TEMPLATES[templateIdx];

      const enTitle = titleTemplate(s.title, chapter);
      const enContent = contentTemplate(s.title, chapter);

      // Translate to Thai
      console.log(`${progress} ${s.title} → translating...`);
      const thTitle = await translateToThai(enTitle);
      await sleep(1500);
      const thContent = await translateToThai(enContent);
      await sleep(1500);

      // Create slug
      const shortId = createId().slice(0, 8);
      const slug = `${s.slug}-ch-${chapter}-${shortId}`;

      // Random upvotes
      const upvoteCount = Math.floor(Math.random() * 500) + 50;

      // Insert spoiler (use Thai title/content since most users are Thai)
      await db.insert(spoilers).values({
        seriesId: s.id,
        authorId: "test-user-prod",
        title: thTitle,
        content: thContent,
        chapter: String(chapter),
        slug,
        upvoteCount,
      });

      console.log(`  → ${thTitle.slice(0, 60)}... (+${upvoteCount})`);
      created++;
    } catch (err) {
      console.error(`${progress} ✗ ${s.title}: ${err instanceof Error ? err.message : err}`);
      failed++;
      await sleep(3000);
    }
  }

  console.log(`\n[generate] Done! Created: ${created}, Failed: ${failed}`);
  process.exit(0);
}

main();
