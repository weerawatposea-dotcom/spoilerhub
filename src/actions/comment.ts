"use server";

import { db } from "@/db";
import { comments, spoilers, notifications } from "@/db/schema";
import { requireAuth } from "@/lib/auth-utils";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { invalidateCache } from "@/lib/cache";

export async function addComment(spoilerId: string, formData: FormData) {
  const session = await requireAuth();
  const content = formData.get("content") as string;
  if (!content?.trim()) throw new Error("Comment cannot be empty");

  await db.insert(comments).values({ spoilerId, authorId: session.user.id, content: content.trim() });

  const [spoiler] = await db.select({ authorId: spoilers.authorId }).from(spoilers).where(eq(spoilers.id, spoilerId)).limit(1);
  if (spoiler && spoiler.authorId !== session.user.id) {
    await db.insert(notifications).values({
      userId: spoiler.authorId, type: "comment", referenceType: "spoiler",
      referenceId: spoilerId, message: `${session.user.name ?? "Someone"} commented on your spoiler`,
    });
  }
  invalidateCache("spoiler-comments:*");
  revalidatePath(`/spoiler`);
}

export async function deleteComment(commentId: string) {
  const session = await requireAuth();
  const [comment] = await db.select().from(comments).where(eq(comments.id, commentId)).limit(1);
  if (!comment) throw new Error("Comment not found");
  if (comment.authorId !== session.user.id && session.user.role !== "admin") throw new Error("Unauthorized");
  await db.delete(comments).where(eq(comments.id, commentId));
  invalidateCache("spoiler-comments:*");
  revalidatePath(`/spoiler`);
}
