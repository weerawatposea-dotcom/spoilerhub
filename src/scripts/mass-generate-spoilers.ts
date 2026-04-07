/**
 * Mass generate realistic spoilers from series synopsis data
 *
 * Usage:
 *   DATABASE_URL=xxx bun run src/scripts/mass-generate-spoilers.ts --offset=0 --limit=110 --batch=1
 *
 * Each series gets 5 spoilers:
 *   1. Plot twist / revelation
 *   2. Epic battle / confrontation
 *   3. Character development / backstory
 *   4. New arc / world expansion
 *   5. Emotional climax / turning point
 *
 * Content is generated from real synopsis data then translated to Thai
 */

import translate from "google-translate-api-x";
import { db } from "../db/index";
import { series, spoilers, users } from "../db/schema";
import { eq, sql, isNotNull } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// ─── CLI Args ────────────────────────────────────

const args = Object.fromEntries(
  process.argv
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, v] = a.replace("--", "").split("=");
      return [k, v ?? "true"];
    })
);

const OFFSET = parseInt(args.offset ?? "0");
const LIMIT = parseInt(args.limit ?? "110");
const BATCH = args.batch ?? "1";

// ─── Helpers ─────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function translateToThai(text: string): Promise<string> {
  try {
    const result = await translate(text, { from: "en", to: "th" });
    return result.text;
  } catch {
    return text;
  }
}

function extractPlotElements(synopsis: string) {
  const sentences = synopsis
    .replace(/\n/g, ". ")
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  return {
    intro: sentences[0] || "The story follows a young protagonist",
    setting: sentences[1] || "in a world filled with danger and mystery",
    conflict: sentences[2] || "who must overcome impossible challenges",
    detail: sentences[3] || "Along the way, unexpected allies and enemies appear",
    theme: sentences[4] || "The journey tests the limits of friendship and courage",
  };
}

// ─── Spoiler Templates (5 per series) ────────────

function generateFiveSpoilers(
  title: string,
  synopsis: string,
  type: string,
  baseChapter: number
) {
  const p = extractPlotElements(synopsis);

  return [
    // 1. Plot Twist / Revelation
    {
      titleEn: `${title} Ch.${baseChapter} — Shocking Truth Revealed!`,
      contentEn: `## Chapter ${baseChapter} — The Revelation\n\n${p.intro}. However, this chapter turns everything upside down with a massive revelation.\n\n### Key Plot Points\n- A character long thought to be an ally reveals their true nature\n- The protagonist discovers a hidden connection to the main antagonist\n- ${p.conflict}\n- A secret organization that has been manipulating events from the shadows is finally exposed\n\n### Impact\nThis revelation recontextualizes many earlier events in the series. Fans are going back to re-read previous chapters with this new information.\n\n### Rating: ★★★★★\nOne of the most impactful chapters in the series so far.`,
      chapter: baseChapter,
    },
    // 2. Epic Battle / Confrontation
    {
      titleEn: `${title} Ch.${baseChapter + 1} — Ultimate Showdown!`,
      contentEn: `## Chapter ${baseChapter + 1} — The Battle\n\n${p.setting}. The tension that has been building finally erupts into an all-out confrontation.\n\n### Battle Highlights\n- The protagonist unleashes a power that has been foreshadowed for dozens of chapters\n- Two rival factions clash in a beautifully choreographed sequence\n- A supporting character steps up with an unexpected power-up\n- The environment itself becomes a weapon in this intense fight\n\n### Casualties & Consequences\n- A beloved character sustains serious injuries\n- The battlefield is completely transformed\n- ${p.detail}\n\n### Fan Verdict\nThis battle chapter has been called one of the best action sequences in recent ${type} history.`,
      chapter: baseChapter + 1,
    },
    // 3. Character Development / Backstory
    {
      titleEn: `${title} Ch.${baseChapter + 2} — The Untold Past`,
      contentEn: `## Chapter ${baseChapter + 2} — Backstory Arc\n\n${p.theme}. This chapter takes a step back from the action to explore what drives the characters.\n\n### Revelations\n- A major character's tragic origin is finally shown in full\n- The reason behind their seemingly irrational decisions becomes clear\n- A parallel is drawn between the protagonist's journey and the villain's past\n- ${p.intro}\n\n### Emotional Moments\n- A flashback scene that brings everything full circle\n- The art style shifts to convey the emotional weight\n- Dialogue that has fans in tears\n\n### Character Growth\nThis chapter solidifies why this series excels at character development alongside its action.`,
      chapter: baseChapter + 2,
    },
    // 4. New Arc / World Expansion
    {
      titleEn: `${title} Ch.${baseChapter + 3} — A New World Awaits`,
      contentEn: `## Chapter ${baseChapter + 3} — New Arc Begins\n\nAfter the conclusion of the previous arc, the story expands into uncharted territory. ${p.setting}.\n\n### New Elements\n- A completely new location is introduced with its own rules and power system\n- Fresh characters with mysterious motivations enter the picture\n- The protagonist must adapt their abilities to a different environment\n- ${p.conflict}\n\n### World Building\n- The lore deepens significantly with revelations about the world's history\n- Connections to earlier arcs become apparent\n- A new threat emerges that dwarfs previous antagonists\n\n### Speculation\nFans are theorizing heavily about where this new arc will lead. The most popular theory suggests a connection to events hinted at in the first few chapters.`,
      chapter: baseChapter + 3,
    },
    // 5. Emotional Climax / Turning Point
    {
      titleEn: `${title} Ch.${baseChapter + 4} — The Moment Everything Changed`,
      contentEn: `## Chapter ${baseChapter + 4} — Turning Point\n\n${p.intro}. This chapter marks the definitive turning point of the current saga.\n\n### Critical Events\n- A sacrifice that no one saw coming changes the dynamic of the entire group\n- The protagonist makes a choice that will have lasting consequences\n- An enemy becomes an unlikely ally in a desperate situation\n- ${p.theme}\n\n### Aftermath\n- The status quo is permanently altered\n- Power dynamics shift in unexpected ways\n- Seeds are planted for what promises to be the most intense arc yet\n\n### Community Reaction\nThis chapter broke social media — trending #1 on Twitter/X for hours. It's being called a masterclass in storytelling that will be remembered for years.`,
      chapter: baseChapter + 4,
    },
  ];
}

// ─── User pool ───────────────────────────────────

const AUTO_USERS = [
  { id: "auto-user-0", name: "SpoilerFan" },
  { id: "auto-user-1", name: "MangaLover" },
  { id: "auto-user-2", name: "OtakuKing" },
  { id: "auto-user-3", name: "WebtoonAddict" },
  { id: "auto-user-4", name: "NovelReader" },
  { id: "auto-user-5", name: "AnimeExpert" },
  { id: "auto-user-6", name: "ManhwaFan88" },
  { id: "auto-user-7", name: "ChapterHunter" },
  { id: "auto-user-8", name: "PlotTwistKing" },
  { id: "auto-user-9", name: "SpoilMaster" },
];

// ─── Main ────────────────────────────────────────

async function main() {
  console.log(`[batch-${BATCH}] Starting: offset=${OFFSET}, limit=${LIMIT}`);

  // Ensure users exist
  for (const u of AUTO_USERS) {
    await db
      .insert(users)
      .values({ id: u.id, name: u.name, email: `${u.id}@spoilerhub.com`, role: "user" })
      .onConflictDoNothing();
  }

  // Get target series (with synopsis, skip those already with 5+ spoilers)
  const targetSeries = await db
    .select({
      id: series.id,
      title: series.title,
      slug: series.slug,
      type: series.type,
      status: series.status,
      synopsis: series.synopsis,
      existingSpoilers: sql<number>`(SELECT COUNT(*) FROM spoilers WHERE spoilers.series_id = series.id)`,
    })
    .from(series)
    .where(isNotNull(series.synopsis))
    .orderBy(series.id)
    .limit(LIMIT)
    .offset(OFFSET);

  // Filter to series needing more spoilers
  const needsSpoilers = targetSeries.filter(
    (s) => s.synopsis && s.synopsis.length > 20 && Number(s.existingSpoilers) < 5
  );

  console.log(
    `[batch-${BATCH}] Found ${needsSpoilers.length} series needing spoilers (of ${targetSeries.length} fetched)\n`
  );

  let totalCreated = 0;
  let totalFailed = 0;

  for (let i = 0; i < needsSpoilers.length; i++) {
    const s = needsSpoilers[i];
    const existingCount = Number(s.existingSpoilers);
    const spoilersNeeded = 5 - existingCount;
    const progress = `[${i + 1}/${needsSpoilers.length}]`;

    console.log(`${progress} ${s.title} (need ${spoilersNeeded} more)...`);

    try {
      const baseChapter =
        s.status === "ongoing"
          ? Math.floor(Math.random() * 100) + 100
          : Math.floor(Math.random() * 80) + 30;

      const allSpoilers = generateFiveSpoilers(
        s.title,
        s.synopsis!,
        s.type,
        baseChapter
      );

      // Only generate the ones we need
      const toCreate = allSpoilers.slice(0, spoilersNeeded);

      for (let j = 0; j < toCreate.length; j++) {
        const sp = toCreate[j];
        const userId = AUTO_USERS[(i + j) % AUTO_USERS.length].id;

        // Translate title + content
        const thTitle = await translateToThai(sp.titleEn);
        await sleep(800);
        const thContent = await translateToThai(sp.contentEn);
        await sleep(800);

        const shortId = createId().slice(0, 8);

        await db.insert(spoilers).values({
          seriesId: s.id,
          authorId: userId,
          title: thTitle,
          content: thContent,
          chapter: String(sp.chapter),
          slug: `${s.slug}-ch-${sp.chapter}-${shortId}`,
          upvoteCount: Math.floor(Math.random() * 900) + 10,
        });

        totalCreated++;
      }

      console.log(`  → ${toCreate.length} spoilers created`);
    } catch (err) {
      console.error(
        `  ✗ ${err instanceof Error ? err.message : String(err)}`
      );
      totalFailed++;
      await sleep(3000);
    }
  }

  console.log(
    `\n[batch-${BATCH}] DONE! Created: ${totalCreated}, Failed: ${totalFailed}`
  );
  process.exit(0);
}

main();
