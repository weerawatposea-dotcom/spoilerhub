"use server";

import { db } from "@/db";
import { spoilers, bookmarks, notifications, series as seriesTable } from "@/db/schema";
import { requireAuth } from "@/lib/auth-utils";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createId } from "@paralleldrive/cuid2";

export async function createSpoiler(formData: FormData) {
  const session = await requireAuth();

  const seriesId = formData.get("seriesId") as string;
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const chapter = formData.get("chapter") as string;

  const [targetSeries] = await db
    .select()
    .from(seriesTable)
    .where(eq(seriesTable.id, seriesId))
    .limit(1);

  if (!targetSeries) throw new Error("Series not found");

  const shortId = createId().slice(0, 8);
  const slug = `${targetSeries.slug}-ch-${chapter}-${shortId}`;

  const [newSpoiler] = await db
    .insert(spoilers)
    .values({ seriesId, authorId: session.user.id, title, content, chapter, slug })
    .returning();

  // Notify users who bookmarked this series
  const seriesBookmarks = await db
    .select()
    .from(bookmarks)
    .where(eq(bookmarks.seriesId, seriesId));

  if (seriesBookmarks.length > 0) {
    await db.insert(notifications).values(
      seriesBookmarks
        .filter((bm) => bm.userId !== session.user.id)
        .map((bm) => ({
          userId: bm.userId,
          type: "new_spoiler" as const,
          referenceType: "spoiler",
          referenceId: newSpoiler.slug,
          message: `New spoiler: ${targetSeries.title} chapter ${chapter}`,
        }))
    );
  }

  revalidatePath("/");
  revalidatePath(`/series/${targetSeries.slug}`);
  redirect(`/spoiler/${slug}`);
}

export async function deleteSpoiler(id: string) {
  const session = await requireAuth();

  const [spoiler] = await db
    .select()
    .from(spoilers)
    .where(eq(spoilers.id, id))
    .limit(1);

  if (!spoiler) throw new Error("Spoiler not found");
  if (spoiler.authorId !== session.user.id && session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  await db.delete(spoilers).where(eq(spoilers.id, id));
  revalidatePath("/");
}
