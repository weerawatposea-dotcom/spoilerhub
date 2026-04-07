/**
 * Copy Thai translations from local DB to production DB
 *
 * Usage:
 *   PROD_DATABASE_URL=xxx bun run src/scripts/copy-translations.ts
 */

import postgres from "postgres";
import { db } from "../db/index"; // local DB
import { series } from "../db/schema";
import { eq, isNotNull } from "drizzle-orm";

const PROD_URL = process.env.PROD_DATABASE_URL;
if (!PROD_URL) {
  console.error("Set PROD_DATABASE_URL env var");
  process.exit(1);
}

const prodClient = postgres(PROD_URL);

async function main() {
  // Get all translations from local DB
  const translations = await db
    .select({
      slug: series.slug,
      titleTh: series.titleTh,
      synopsisTh: series.synopsisTh,
    })
    .from(series)
    .where(isNotNull(series.titleTh));

  console.log(`[copy] Found ${translations.length} translations to copy`);

  let success = 0;
  let skipped = 0;

  for (const t of translations) {
    try {
      const result = await prodClient`
        UPDATE series SET title_th = ${t.titleTh}, synopsis_th = ${t.synopsisTh}
        WHERE slug = ${t.slug} AND title_th IS NULL
      `;
      if (result.count > 0) {
        success++;
      } else {
        skipped++;
      }
    } catch {
      skipped++;
    }
  }

  console.log(`[copy] Done! Updated: ${success}, Skipped: ${skipped}`);
  await prodClient.end();
  process.exit(0);
}

main();
