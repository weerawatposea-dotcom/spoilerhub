/**
 * Standalone sync script — run via cron or manually
 *
 * Usage:
 *   bun run src/scripts/sync-anilist.ts          # update sync
 *   bun run src/scripts/sync-anilist.ts --full    # full sync (initial seed)
 *
 * Cron example (every 6 hours):
 *   0 0,6,12,18 * * * cd /path/to/spoiler && bun run src/scripts/sync-anilist.ts
 */

import { runSync } from "../lib/sync";

const mode = process.argv.includes("--full") ? "full" : "update";

console.log(`[cron] Starting ${mode} sync at ${new Date().toISOString()}`);

runSync(mode)
  .then((result) => {
    console.log("[cron] Sync result:", JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error("[cron] Sync failed:", err);
    process.exit(1);
  });
