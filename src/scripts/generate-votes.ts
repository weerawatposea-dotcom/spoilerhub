/**
 * Generate vote records matching upvote_count for spoilers
 *
 * Usage:
 *   export PATH="$HOME/.bun/bin:$PATH"
 *   DATABASE_URL="postgresql://..." bun run src/scripts/generate-votes.ts
 *
 * Flow:
 *   1. Ensure 10 auto-users exist (auto-user-0 through auto-user-9)
 *   2. Find all spoilers with upvote_count > 0 but 0 vote records
 *   3. For each spoiler, create vote records to match upvote_count
 *   4. Use batch processing (100 spoilers at a time)
 *   5. Report total votes created
 */

import { db } from "../db/index";
import { users, spoilers, votes } from "../db/schema";
import { eq, and, sql, gt } from "drizzle-orm";

interface AutoUser {
  id: string;
  name: string;
  email: string;
}

// Auto-user definitions
const AUTO_USER_CONFIGS: AutoUser[] = [
  { id: "auto-user-0", name: "SpoilerFan", email: "auto-user-0@spoilerhub.com" },
  { id: "auto-user-1", name: "MangaLover", email: "auto-user-1@spoilerhub.com" },
  { id: "auto-user-2", name: "OtakuKing", email: "auto-user-2@spoilerhub.com" },
  { id: "auto-user-3", name: "WebtoonAddict", email: "auto-user-3@spoilerhub.com" },
  { id: "auto-user-4", name: "NovelReader", email: "auto-user-4@spoilerhub.com" },
  { id: "auto-user-5", name: "AnimeExpert", email: "auto-user-5@spoilerhub.com" },
  { id: "auto-user-6", name: "ManhwaFan88", email: "auto-user-6@spoilerhub.com" },
  { id: "auto-user-7", name: "ChapterHunter", email: "auto-user-7@spoilerhub.com" },
  { id: "auto-user-8", name: "PlotTwistKing", email: "auto-user-8@spoilerhub.com" },
  { id: "auto-user-9", name: "SpoilMaster", email: "auto-user-9@spoilerhub.com" },
];

async function ensureAutoUsers(): Promise<void> {
  console.log("[votes] Ensuring auto-users exist...");

  for (const config of AUTO_USER_CONFIGS) {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.id, config.id))
      .limit(1);

    if (!existing.length) {
      await db.insert(users).values({
        id: config.id,
        name: config.name,
        email: config.email,
        role: "user",
      });
      console.log(`  ✓ Created ${config.name} (${config.email})`);
    }
  }

  console.log("[votes] Auto-users ready\n");
}

async function main() {
  try {
    // Step 1: Ensure auto-users exist
    await ensureAutoUsers();

    // Step 2: Get all spoilers with upvote_count > 0 but 0 votes
    console.log("[votes] Finding spoilers with upvote_count > 0 but no votes...");

    const spoilersWithVotes = await db
      .select({ spoilerId: votes.spoilerId })
      .from(votes)
      .groupBy(votes.spoilerId);

    const spoilerIdsWithVotes = new Set(
      spoilersWithVotes.map((v) => v.spoilerId)
    );

    // Get all spoilers with upvote_count > 0
    const allSpoilersWithUpvotes = await db
      .select()
      .from(spoilers)
      .where(gt(spoilers.upvoteCount, 0));

    // Filter to only those without votes
    const targetSpoilers = allSpoilersWithUpvotes.filter(
      (s) => !spoilerIdsWithVotes.has(s.id)
    );

    console.log(`  Found ${targetSpoilers.length} spoilers to process\n`);

    if (targetSpoilers.length === 0) {
      console.log("[votes] No spoilers to process. Exiting.");
      process.exit(0);
    }

    // Step 3: Process in batches of 100
    const BATCH_SIZE = 100;
    let totalVotesCreated = 0;

    for (let i = 0; i < targetSpoilers.length; i += BATCH_SIZE) {
      const batch = targetSpoilers.slice(i, i + BATCH_SIZE);
      console.log(
        `[votes] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(targetSpoilers.length / BATCH_SIZE)} (${batch.length} spoilers)`
      );

      for (const spoiler of batch) {
        // Create votes for all 10 auto-users (all upvotes = +1)
        // Max 10 votes per spoiler due to unique constraint (spoilerId, userId)
        const votesToCreate = AUTO_USER_CONFIGS.map((config) => ({
          spoilerId: spoiler.id,
          userId: config.id,
          value: 1,
        }));

        // Use onConflictDoNothing for the unique constraint
        await db
          .insert(votes)
          .values(votesToCreate)
          .onConflictDoNothing();

        totalVotesCreated += votesToCreate.length;
      }

      console.log(`  → Batch processed. Total votes created so far: ${totalVotesCreated}`);
    }

    console.log(`\n[votes] ✓ Done!`);
    console.log(`[votes] Total votes created: ${totalVotesCreated}`);

    process.exit(0);
  } catch (error) {
    console.error("[votes] Error:", error);
    process.exit(1);
  }
}

main();
