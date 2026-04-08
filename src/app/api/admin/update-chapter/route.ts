import { db } from "@/db";
import { series, spoilers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";

/**
 * POST /api/admin/update-chapter
 *
 * Update latest chapter for a series + optionally create a spoiler
 * Auth: requires SYNC_SECRET key
 *
 * Body: {
 *   key: string (SYNC_SECRET),
 *   title: string (series title to search),
 *   chapter: string (latest chapter number),
 *   date?: string (release date YYYY-MM-DD),
 *   spoilerTitle?: string (Thai spoiler title),
 *   spoilerContent?: string (Thai spoiler content)
 * }
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { key, title, chapter, date, spoilerTitle, spoilerContent } = body;

  // Auth check
  if (!key || key !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!title || !chapter) {
    return NextResponse.json(
      { error: "title and chapter are required" },
      { status: 400 }
    );
  }

  // Find series by title (case-insensitive)
  const [s] = await db
    .select({ id: series.id, slug: series.slug, latestChapter: series.latestChapter })
    .from(series)
    .where(eq(series.title, title))
    .limit(1);

  if (!s) {
    return NextResponse.json({ error: `Series not found: ${title}` }, { status: 404 });
  }

  // Update latest chapter
  await db
    .update(series)
    .set({
      latestChapter: chapter,
      latestChapterDate: date || new Date().toISOString().slice(0, 10),
    })
    .where(eq(series.id, s.id));

  let spoilerCreated = false;

  // Create spoiler if content provided
  if (spoilerTitle && spoilerContent) {
    const shortId = createId().slice(0, 8);
    await db.insert(spoilers).values({
      seriesId: s.id,
      authorId: "auto-user-0",
      title: spoilerTitle,
      content: spoilerContent,
      chapter,
      slug: `${s.slug}-ch-${chapter}-${shortId}`,
      upvoteCount: Math.floor(Math.random() * 300) + 50,
    }).onConflictDoNothing();
    spoilerCreated = true;
  }

  return NextResponse.json({
    success: true,
    series: title,
    chapter,
    date: date || new Date().toISOString().slice(0, 10),
    spoilerCreated,
    previousChapter: s.latestChapter,
  });
}
