"use server";

import { db } from "@/db";
import { votes, spoilers, notifications } from "@/db/schema";
import { requireAuth } from "@/lib/auth-utils";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { invalidateCache } from "@/lib/cache";

export async function vote(spoilerId: string, value: 1 | -1) {
  const session = await requireAuth();

  const [existing] = await db.select().from(votes)
    .where(and(eq(votes.spoilerId, spoilerId), eq(votes.userId, session.user.id))).limit(1);

  if (existing) {
    if (existing.value === value) {
      await db.delete(votes).where(eq(votes.id, existing.id));
      await db.update(spoilers).set({ upvoteCount: sql`${spoilers.upvoteCount} - ${existing.value}` }).where(eq(spoilers.id, spoilerId));
    } else {
      await db.update(votes).set({ value }).where(eq(votes.id, existing.id));
      await db.update(spoilers).set({ upvoteCount: sql`${spoilers.upvoteCount} + ${value - existing.value}` }).where(eq(spoilers.id, spoilerId));
    }
  } else {
    await db.insert(votes).values({ spoilerId, userId: session.user.id, value });
    await db.update(spoilers).set({ upvoteCount: sql`${spoilers.upvoteCount} + ${value}` }).where(eq(spoilers.id, spoilerId));

    if (value === 1) {
      const [spoiler] = await db.select({ upvoteCount: spoilers.upvoteCount, authorId: spoilers.authorId })
        .from(spoilers).where(eq(spoilers.id, spoilerId)).limit(1);
      const milestones = [10, 50, 100, 500];
      if (spoiler && spoiler.upvoteCount && milestones.includes(spoiler.upvoteCount) && spoiler.authorId !== session.user.id) {
        await db.insert(notifications).values({
          userId: spoiler.authorId, type: "upvote", referenceType: "spoiler",
          referenceId: spoilerId, message: `Your spoiler reached ${spoiler.upvoteCount} upvotes!`,
        });
      }
    }
  }
  invalidateCache("spoiler:*");
  revalidatePath(`/spoiler`);
}
