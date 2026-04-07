/**
 * Generate realistic spoiler content from series synopsis
 * Uses synopsis-aware templates + Google Translate
 *
 * Usage:
 *   DATABASE_URL=xxx bun run src/scripts/generate-ai-spoilers.ts
 *   DATABASE_URL=xxx bun run src/scripts/generate-ai-spoilers.ts --limit=100
 */

import translate from "google-translate-api-x";
import { db } from "../db/index";
import { series, spoilers, users } from "../db/schema";
import { eq, notInArray, isNotNull } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

// Extract key words from synopsis for realistic spoilers
function extractKeyElements(synopsis: string): {
  protagonist: string;
  setting: string;
  conflict: string;
} {
  const sentences = synopsis.split(/[.!?]+/).filter(Boolean);
  return {
    protagonist: sentences[0]?.trim().slice(0, 80) || "The main character",
    setting: sentences[1]?.trim().slice(0, 80) || "in a world of conflict",
    conflict: sentences[2]?.trim().slice(0, 80) || "faces their ultimate challenge",
  };
}

// Generate 2-3 spoilers per series based on synopsis
function generateSpoilerSet(title: string, synopsis: string, type: string, chapter: number) {
  const el = extractKeyElements(synopsis);

  const spoilerTemplates = [
    {
      titleEn: `${title} Ch.${chapter} — The Turning Point!`,
      contentEn: `## Chapter ${chapter} Summary\n\n${el.protagonist}. But everything changes when an unexpected revelation turns the story on its head.\n\n### Key Moments\n- A major character reveals their true intentions\n- The power balance shifts dramatically\n- ${el.conflict}\n- An alliance forms between former enemies\n\n### What's Next\nThe stage is set for an epic confrontation that will determine the fate of everyone involved.`,
    },
    {
      titleEn: `${title} Ch.${chapter + 1} — Epic Clash!`,
      contentEn: `## Chapter ${chapter + 1} Summary\n\n${el.setting}. The tension reaches its peak as two powerful forces collide.\n\n### Key Moments\n- An intense battle sequence with stunning visuals\n- A beloved character makes a crucial sacrifice\n- New abilities are revealed in the heat of combat\n- The villain's backstory adds depth to the conflict\n\n### Fan Reactions\nThis chapter has fans divided — some call it the best chapter yet, while others are heartbroken by the sacrifice.`,
    },
    {
      titleEn: `${title} Ch.${chapter + 2} — New Arc Begins!`,
      contentEn: `## Chapter ${chapter + 2} Summary\n\nAfter the events of the previous arc, the story takes a fresh direction. ${el.protagonist}.\n\n### Key Moments\n- Time skip reveals character growth\n- New mysterious characters are introduced\n- The world expands with unexplored territories\n- Seeds are planted for the next major conflict\n\n### Theory Corner\nFans are speculating about the connection between the new characters and events from earlier in the series.`,
    },
  ];

  return spoilerTemplates;
}

async function translateText(text: string): Promise<string> {
  try {
    const result = await translate(text, { from: "en", to: "th" });
    return result.text;
  } catch { return text; }
}

async function main() {
  const limitArg = process.argv.find((a) => a.startsWith("--limit"));
  const limit = limitArg ? parseInt(limitArg.split("=")[1] || "30") : 30;

  // Ensure test users exist
  const userNames = ["SpoilerFan", "MangaLover", "OtakuKing", "WebtoonAddict", "NovelReader"];
  for (let i = 0; i < userNames.length; i++) {
    const uid = `auto-user-${i}`;
    await db.insert(users).values({
      id: uid, name: userNames[i], email: `${userNames[i].toLowerCase()}@spoilerhub.com`, role: "user",
    }).onConflictDoNothing();
  }

  // Find series WITH synopsis that have few spoilers
  const seriesWithSpoilers = await db.select({ seriesId: spoilers.seriesId }).from(spoilers);
  const idsWithSpoilers = [...new Set(seriesWithSpoilers.map((s) => s.seriesId))];

  let targetSeries;
  if (idsWithSpoilers.length > 0) {
    targetSeries = await db.select().from(series)
      .where(notInArray(series.id, idsWithSpoilers))
      .limit(limit);
  } else {
    targetSeries = await db.select().from(series).limit(limit);
  }

  // Filter only series with synopsis
  targetSeries = targetSeries.filter((s) => s.synopsis && s.synopsis.length > 30);

  console.log(`[ai-spoilers] Generating spoilers for ${targetSeries.length} series\n`);

  let created = 0;
  let failed = 0;

  for (let i = 0; i < targetSeries.length; i++) {
    const s = targetSeries[i];
    const progress = `[${i + 1}/${targetSeries.length}]`;
    console.log(`${progress} ${s.title}...`);

    try {
      const baseChapter = s.status === "ongoing"
        ? Math.floor(Math.random() * 80) + 120
        : Math.floor(Math.random() * 60) + 40;

      const spoilerSet = generateSpoilerSet(s.title, s.synopsis!, s.type, baseChapter);

      for (let j = 0; j < spoilerSet.length; j++) {
        const sp = spoilerSet[j];
        const authorId = `auto-user-${(i + j) % userNames.length}`;

        // Translate
        const thTitle = await translateText(sp.titleEn);
        await sleep(1200);
        const thContent = await translateText(sp.contentEn);
        await sleep(1200);

        const shortId = createId().slice(0, 8);
        const chapterNum = baseChapter + j;

        await db.insert(spoilers).values({
          seriesId: s.id,
          authorId,
          title: thTitle,
          content: thContent,
          chapter: String(chapterNum),
          slug: `${s.slug}-ch-${chapterNum}-${shortId}`,
          upvoteCount: Math.floor(Math.random() * 800) + 20,
        });

        created++;
      }

      console.log(`  → ${spoilerSet.length} spoilers created`);
    } catch (err) {
      console.error(`  ✗ ${err instanceof Error ? err.message : err}`);
      failed++;
      await sleep(3000);
    }
  }

  console.log(`\n[ai-spoilers] Done! Created: ${created}, Failed: ${failed}`);
  process.exit(0);
}

main();
