/**
 * Translate series to Thai using Gemini CLI (local)
 *
 * Usage:
 *   bun run src/scripts/translate-gemini.ts              # translate untranslated
 *   bun run src/scripts/translate-gemini.ts --all        # re-translate everything
 *   DATABASE_URL=xxx bun run src/scripts/translate-gemini.ts  # target remote DB
 *
 * Requires: Gemini CLI installed and authenticated
 *   /opt/homebrew/bin/gemini (with node in PATH)
 */

import { execSync } from "child_process";
import { db } from "../db/index";
import { series } from "../db/schema";
import { eq, isNull } from "drizzle-orm";

const GEMINI_PATH = "/opt/homebrew/bin/gemini";
const NODE_PATH = "/opt/homebrew/Cellar/node/25.8.0/bin";

// ─── Well-known Thai titles ──────────────────────

const KNOWN_THAI_TITLES: Record<string, string> = {
  "One Piece": "วันพีซ",
  "Naruto": "นารูโตะ",
  "Attack on Titan": "ผ่าพิภพไททัน",
  "Dragon Ball": "ดราก้อนบอล",
  "Demon Slayer: Kimetsu no Yaiba": "ดาบพิฆาตอสูร",
  "My Hero Academia": "มายฮีโร่ อคาเดเมีย",
  "Jujutsu Kaisen": "มหาเวทย์ผนึกมาร",
  "Chainsaw Man": "เชนซอว์แมน",
  "Solo Leveling": "โซโลเลเวลลิ่ง",
  "Tower of God": "หอคอยเทพเจ้า",
  "Omniscient Reader's Viewpoint": "มุมมองผู้อ่านรอบรู้",
  "Fullmetal Alchemist": "แขนกลคนแปรธาตุ",
  "Death Note": "เดธโน้ต",
  "Hunter x Hunter": "ฮันเตอร์ x ฮันเตอร์",
  "Bleach": "บลีช",
  "Tokyo Ghoul": "โตเกียวกูล",
  "Spy x Family": "สปาย x แฟมิลี่",
  "Vinland Saga": "มหากาพย์วินแลนด์",
  "Berserk": "เบอร์เซิร์ก",
  "Slam Dunk": "สแลมดังก์",
  "Kingdom": "คิงดอม",
  "Haikyuu!!": "ไฮคิว!!",
  "One Punch Man": "วันพั้นช์แมน",
  "Frieren: Beyond Journey's End": "ฟรีเรน ผู้ส่งวิญญาณสู่สรวงสวรรค์",
  "Sakamoto Days": "ซาคาโมโตะ เดย์ส",
  "Dandadan": "ดันดาดัน",
  "Blue Lock": "บลูล็อค",
  "Kaiju No. 8": "ไคจูหมายเลข 8",
};

// ─── Gemini CLI Translation ──────────────────────

function translateWithGemini(title: string, synopsis: string | null): { titleTh: string; synopsisTh: string | null } {
  const prompt = `Translate this anime/manga info to Thai. Return ONLY valid JSON with "titleTh" and "synopsisTh" fields. No markdown fences, no explanation.

For titles: use established Thai names if well-known (e.g. One Piece = วันพีซ). Otherwise transliterate to Thai.
For synopsis: translate naturally to Thai.

Title: ${title}
Synopsis: ${synopsis || "(none)"}`;

  try {
    const output = execSync(
      `echo ${JSON.stringify(prompt)} | PATH="${NODE_PATH}:$PATH" "${GEMINI_PATH}" -m gemini-2.5-flash-preview-05-20 2>/dev/null`,
      { encoding: "utf-8", timeout: 30000 }
    );

    // Extract JSON from response
    const jsonMatch = output.match(/\{[\s\S]*"titleTh"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        titleTh: parsed.titleTh || title,
        synopsisTh: parsed.synopsisTh || null,
      };
    }
  } catch (err) {
    // Fallback: try simpler translation
    try {
      const titleOutput = execSync(
        `echo ${JSON.stringify(`Translate to Thai (just the translation, nothing else): ${title}`)} | PATH="${NODE_PATH}:$PATH" "${GEMINI_PATH}" -m gemini-2.5-flash-preview-05-20 2>/dev/null`,
        { encoding: "utf-8", timeout: 15000 }
      ).trim();
      return { titleTh: titleOutput || title, synopsisTh: null };
    } catch {
      // ignore
    }
  }

  return { titleTh: title, synopsisTh: null };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Main ────────────────────────────────────────

async function main() {
  const translateAll = process.argv.includes("--all");

  let toTranslate;
  if (translateAll) {
    toTranslate = await db.select().from(series);
  } else {
    toTranslate = await db.select().from(series).where(isNull(series.titleTh));
  }

  console.log(`[gemini-translate] Found ${toTranslate.length} series to translate\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < toTranslate.length; i++) {
    const s = toTranslate[i];
    const progress = `[${i + 1}/${toTranslate.length}]`;

    try {
      let titleTh: string;
      let synopsisTh: string | null = null;

      if (KNOWN_THAI_TITLES[s.title]) {
        titleTh = KNOWN_THAI_TITLES[s.title];
        console.log(`${progress} ${s.title} → ${titleTh} (known)`);

        // Still translate synopsis with Gemini
        if (s.synopsis) {
          const result = translateWithGemini(s.title, s.synopsis);
          synopsisTh = result.synopsisTh;
        }
      } else {
        console.log(`${progress} ${s.title} → translating with Gemini...`);
        const result = translateWithGemini(s.title, s.synopsis);
        titleTh = result.titleTh;
        synopsisTh = result.synopsisTh;
        console.log(`  → ${titleTh}`);
      }

      await db.update(series).set({ titleTh, synopsisTh }).where(eq(series.id, s.id));
      success++;

      // Rate limit: 2 second between Gemini calls
      await sleep(2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${progress} ✗ ${s.title}: ${msg}`);
      failed++;
      await sleep(3000);
    }
  }

  console.log(`\n[gemini-translate] Done! Success: ${success}, Failed: ${failed}`);
  process.exit(0);
}

main();
