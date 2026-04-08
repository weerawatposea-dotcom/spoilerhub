/**
 * Verify votes were created correctly
 */

import { db } from "../db/index";
import { votes, users, spoilers } from "../db/schema";
import { count, sql } from "drizzle-orm";

async function main() {
  // Total votes created
  const totalVotes = await db
    .select({ count: count() })
    .from(votes);

  // Auto-users created
  const autoUsers = await db
    .select({ count: count() })
    .from(users)
    .where(sql`email LIKE 'auto-user-%@spoilerhub.com'`);

  // Spoilers with votes
  const spoilersWithVotes = await db
    .select({ count: count() })
    .from(spoilers)
    .where(
      sql`id IN (SELECT DISTINCT spoiler_id FROM votes)`
    );

  console.log("=== VOTES VERIFICATION ===");
  console.log(`Total vote records: ${totalVotes[0].count}`);
  console.log(`Auto-users created: ${autoUsers[0].count}`);
  console.log(`Spoilers with votes: ${spoilersWithVotes[0].count}`);

  process.exit(0);
}

main();
