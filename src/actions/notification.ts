"use server";

import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireAuth } from "@/lib/auth-utils";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function markAllRead() {
  const session = await requireAuth();
  await db.update(notifications).set({ isRead: true })
    .where(and(eq(notifications.userId, session.user.id), eq(notifications.isRead, false)));
  revalidatePath("/notifications");
}
