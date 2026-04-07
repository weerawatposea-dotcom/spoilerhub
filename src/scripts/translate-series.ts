/**
 * Translate series titles and synopses to Thai using Gemini API
 *
 * Usage:
 *   GEMINI_API_KEY=xxx bun run src/scripts/translate-series.ts
 *   GEMINI_API_KEY=xxx bun run src/scripts/translate-series.ts --all   # re-translate everything
 *
 * Requires: GEMINI_API_KEY (free at https://aistudio.google.com/apikey)
 * Rate limit: 15 RPM free tier, script auto-throttles
 */

import { db } from "../db/index";
import { series } from "../db/schema";
import { eq, isNull, and } from "drizzle-orm";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("ERROR: GEMINI_API_KEY not set");
  console.error("Get a free key at: https://aistudio.google.com/apikey");
  process.exit(1);
}

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// ─── Gemini API Call ─────────────────────────────

async function translateWithGemini(
  title: string,
  synopsis: string | null
): Promise<{ titleTh: string; synopsisTh: string | null }> {
  const prompt = `Translate the following anime/manga series information to Thai.
Return ONLY a JSON object with "titleTh" and "synopsisTh" fields.
Do NOT add markdown code fences. Do NOT add any explanation.

For the title:
- If it's a well-known series with an established Thai name, use that (e.g. "One Piece" = "วันพีซ", "Attack on Titan" = "ผ่าพิภพไททัน")
- If no established Thai name exists, keep the original title and add a Thai transliteration in parentheses (e.g. "Solo Leveling (โซโลเลเวลลิ่ง)")
- Japanese/Korean proper nouns should be transliterated to Thai

Title: ${title}
${synopsis ? `Synopsis: ${synopsis}` : "Synopsis: (none)"}`;

  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API ${response.status}: ${error}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  // Parse JSON from response (strip code fences if present)
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      titleTh: parsed.titleTh || title,
      synopsisTh: parsed.synopsisTh || null,
    };
  } catch {
    console.warn(`  Failed to parse JSON, using title as-is: ${text.slice(0, 100)}`);
    return { titleTh: title, synopsisTh: null };
  }
}

// ─── Throttle helper (15 RPM = 1 req per 4 sec) ─

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Main ────────────────────────────────────────

async function main() {
  const translateAll = process.argv.includes("--all");

  // Get series that need translation
  let toTranslate;
  if (translateAll) {
    toTranslate = await db.select().from(series);
  } else {
    toTranslate = await db
      .select()
      .from(series)
      .where(isNull(series.titleTh));
  }

  console.log(`[translate] Found ${toTranslate.length} series to translate`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < toTranslate.length; i++) {
    const s = toTranslate[i];
    console.log(`[${i + 1}/${toTranslate.length}] ${s.title}...`);

    try {
      const { titleTh, synopsisTh } = await translateWithGemini(
        s.title,
        s.synopsis
      );

      await db
        .update(series)
        .set({ titleTh, synopsisTh })
        .where(eq(series.id, s.id));

      console.log(`  → ${titleTh}`);
      success++;
    } catch (err) {
      console.error(`  ✗ Error: ${err instanceof Error ? err.message : err}`);
      failed++;
    }

    // Rate limit: wait 4 seconds between requests (15 RPM)
    if (i < toTranslate.length - 1) {
      await sleep(4200);
    }
  }

  console.log(
    `\n[translate] Done! Success: ${success}, Failed: ${failed}, Total: ${toTranslate.length}`
  );
  process.exit(0);
}

main();
