import { db } from "@/db";
import { series, spoilers } from "@/db/schema";
import { ilike, eq, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { cached } from "@/lib/cache";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";

  if (q.length < 2) {
    return NextResponse.json({ series: [], spoilers: [] });
  }

  const cacheKey = `search:universal:${q.toLowerCase()}`;

  const results = await cached(cacheKey, 60, async () => {
    const [seriesResults, spoilerResults] = await Promise.all([
      // Search series by title
      db
        .select({
          id: series.id,
          title: series.title,
          titleTh: series.titleTh,
          slug: series.slug,
          type: series.type,
          coverImage: series.coverImage,
        })
        .from(series)
        .where(or(ilike(series.title, `%${q}%`), ilike(series.titleTh, `%${q}%`)))
        .limit(5),

      // Search spoilers by title, join with series for seriesTitle + seriesSlug
      db
        .select({
          id: spoilers.id,
          title: spoilers.title,
          slug: spoilers.slug,
          chapter: spoilers.chapter,
          seriesTitle: series.title,
          seriesTitleTh: series.titleTh,
          seriesSlug: series.slug,
        })
        .from(spoilers)
        .innerJoin(series, eq(spoilers.seriesId, series.id))
        .where(ilike(spoilers.title, `%${q}%`))
        .limit(5),
    ]);

    return { series: seriesResults, spoilers: spoilerResults };
  });

  return NextResponse.json(results);
}
