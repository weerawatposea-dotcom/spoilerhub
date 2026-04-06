"use server";

import { db } from "@/db";
import { series, genres, seriesGenres } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-utils";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export async function createSeries(formData: FormData) {
  await requireAdmin();

  const title = formData.get("title") as string;
  const type = formData.get("type") as "anime" | "manga" | "manhwa" | "manhua" | "novel" | "other";
  const status = formData.get("status") as "ongoing" | "completed" | "hiatus";
  const coverImage = formData.get("coverImage") as string;
  const synopsis = formData.get("synopsis") as string;
  const genreIds = formData.getAll("genres") as string[];

  const slug = slugify(title);

  const [newSeries] = await db
    .insert(series)
    .values({ title, slug, type, status, coverImage, synopsis })
    .returning();

  if (genreIds.length > 0) {
    await db.insert(seriesGenres).values(
      genreIds.map((genreId) => ({
        seriesId: newSeries.id,
        genreId,
      }))
    );
  }

  revalidatePath("/");
  revalidatePath("/browse");
}

export async function deleteSeries(id: string) {
  await requireAdmin();
  await db.delete(series).where(eq(series.id, id));
  revalidatePath("/");
  revalidatePath("/browse");
}
