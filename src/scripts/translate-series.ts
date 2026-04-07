/**
 * Translate series titles and synopses to Thai using Google Translate
 *
 * Usage:
 *   bun run src/scripts/translate-series.ts          # translate untranslated only
 *   bun run src/scripts/translate-series.ts --all    # re-translate everything
 *
 * No API key needed — uses google-translate-api-x (free Google Translate)
 */

import translate from "google-translate-api-x";
import { db } from "../db/index";
import { series } from "../db/schema";
import { eq, isNull } from "drizzle-orm";

// ─── Well-known Thai names for popular series ────

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
  "The Beginning After the End": "จุดเริ่มต้นหลังจุดจบ",
  "Omniscient Reader's Viewpoint": "มุมมองผู้อ่านรอบรู้",
  "Fullmetal Alchemist": "แขนกลคนแปรธาตุ",
  "Death Note": "เดธโน้ต",
  "Hunter x Hunter": "ฮันเตอร์ x ฮันเตอร์",
  "Bleach": "บลีช",
  "Tokyo Ghoul": "โตเกียวกูล",
  "Spy x Family": "สปาย x แฟมิลี่",
  "Vinland Saga": "มหากาพย์วินแลนด์",
  "Berserk": "เบอร์เซิร์ก",
  "Vagabond": "วากาบอนด์",
  "Slam Dunk": "สแลมดังก์",
  "Kingdom": "คิงดอม",
  "Haikyuu!!": "ไฮคิว!! คู่ตบฟ้าประทาน",
  "One Punch Man": "วันพั้นช์แมน",
  "Frieren: Beyond Journey's End": "ฟรีเรน นักบวชผู้เดินทางไปหลังจบการผจญภัย",
  "Sakamoto Days": "ซาคาโมโตะ เดย์ส",
  "Dandadan": "ดันดาดัน",
  "Blue Lock": "บลูล็อค",
  "Kaiju No. 8": "ไคจูหมายเลข 8",
};

// ─── Translation ─────────────────────────────────

async function translateText(text: string): Promise<string> {
  const result = await translate(text, { from: "en", to: "th" });
  return result.text;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Main ────────────────────────────────────────

async function main() {
  const translateAll = process.argv.includes("--all");

  let toTranslate;
  if (translateAll) {
    toTranslate = await db.select().from(series);
  } else {
    toTranslate = await db
      .select()
      .from(series)
      .where(isNull(series.titleTh));
  }

  console.log(`[translate] Found ${toTranslate.length} series to translate\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < toTranslate.length; i++) {
    const s = toTranslate[i];
    const progress = `[${i + 1}/${toTranslate.length}]`;

    try {
      // Title: use known name or translate
      let titleTh: string;
      if (KNOWN_THAI_TITLES[s.title]) {
        titleTh = KNOWN_THAI_TITLES[s.title];
        console.log(`${progress} ${s.title} → ${titleTh} (known)`);
      } else {
        titleTh = await translateText(s.title);
        console.log(`${progress} ${s.title} → ${titleTh}`);
        await sleep(1500); // gentle rate limit
      }

      // Synopsis: translate if exists
      let synopsisTh: string | null = null;
      if (s.synopsis) {
        synopsisTh = await translateText(s.synopsis);
        await sleep(1500);
      }

      // Save to DB
      await db
        .update(series)
        .set({ titleTh, synopsisTh })
        .where(eq(series.id, s.id));

      success++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${progress} ✗ ${s.title}: ${msg}`);
      failed++;
      // Wait longer on error (might be rate limited)
      await sleep(5000);
    }
  }

  console.log(
    `\n[translate] Done! Success: ${success}, Failed: ${failed}, Total: ${toTranslate.length}`
  );
  process.exit(0);
}

main();
