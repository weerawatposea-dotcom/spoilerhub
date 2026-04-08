import { db } from "@/db";
import { series } from "@/db/schema";
import { eq, desc, sql, and, or, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/admin/ongoing-series?key=SYNC_SECRET&limit=20&upcoming=true
 *
 * Returns top ongoing series with spoiler count
 * If upcoming=true, returns only series releasing in next 3 days
 * Auth: requires SYNC_SECRET key
 */
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "50");
  const upcoming = request.nextUrl.searchParams.get("upcoming") === "true";

  if (!key || key !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Calculate which release days are "upcoming" (within 3 days)
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const today = new Date().getDay(); // 0=Sun, 1=Mon, ...
  const upcomingDays = [0, 1, 2, 3].map((offset) => days[(today + offset) % 7]);

  const conditions = [eq(series.status, "ongoing")];

  if (upcoming) {
    // Only series releasing in next 3 days OR no release_day set (check those too)
    conditions.push(
      or(
        sql`${series.releaseDay} IN (${sql.join(upcomingDays.map(d => sql`${d}`), sql`, `)})`,
        isNull(series.releaseDay)
      )!
    );
  }

  const result = await db
    .select({
      id: series.id,
      title: series.title,
      slug: series.slug,
      type: series.type,
      latestChapter: series.latestChapter,
      latestChapterDate: series.latestChapterDate,
      releaseDay: series.releaseDay,
      spoilerCount: sql<number>`(SELECT COUNT(*) FROM spoilers WHERE spoilers.series_id = series.id)`,
    })
    .from(series)
    .where(and(...conditions))
    .orderBy(
      desc(sql`(SELECT COUNT(*) FROM spoilers WHERE spoilers.series_id = series.id)`)
    )
    .limit(limit);

  return NextResponse.json({
    today: days[today],
    upcomingDays: upcoming ? upcomingDays : undefined,
    count: result.length,
    series: result,
  });
}
