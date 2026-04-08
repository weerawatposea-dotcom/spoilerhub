import { db } from "@/db";
import { series, spoilers } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/admin/ongoing-series?key=SYNC_SECRET&limit=20
 *
 * Returns top ongoing series with spoiler count
 * Auth: requires SYNC_SECRET key
 */
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "20");

  if (!key || key !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db
    .select({
      id: series.id,
      title: series.title,
      slug: series.slug,
      type: series.type,
      latestChapter: series.latestChapter,
      latestChapterDate: series.latestChapterDate,
      spoilerCount: sql<number>`(SELECT COUNT(*) FROM spoilers WHERE spoilers.series_id = series.id)`,
    })
    .from(series)
    .where(eq(series.status, "ongoing"))
    .orderBy(
      desc(sql`(SELECT COUNT(*) FROM spoilers WHERE spoilers.series_id = series.id)`)
    )
    .limit(limit);

  return NextResponse.json(result);
}
