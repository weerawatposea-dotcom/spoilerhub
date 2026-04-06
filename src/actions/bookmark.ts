"use server";

import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { requireAuth } from "@/lib/auth-utils";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function toggleBookmark(seriesId: string) {
  const session = await requireAuth();
  const existing = await db.select().from(bookmarks)
    .where(and(eq(bookmarks.userId, session.user.id), eq(bookmarks.seriesId, seriesId)))
    .limit(1);

  if (existing.length > 0) {
    await db.delete(bookmarks).where(eq(bookmarks.id, existing[0].id));
  } else {
    await db.insert(bookmarks).values({ userId: session.user.id, seriesId });
  }

  revalidatePath(`/series`);
  revalidatePath(`/bookmarks`);
}
