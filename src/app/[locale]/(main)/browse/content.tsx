import { db } from "@/db";
import { series, seriesGenres, genres } from "@/db/schema";
import { eq, ilike, and, desc } from "drizzle-orm";
import { SeriesCard } from "@/components/series-card";
import { SearchBar } from "@/components/search-bar";
import { TypeTabs } from "@/components/type-tabs";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Suspense } from "react";

export async function BrowseContent({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; genre?: string }>;
}) {
  const { q, type, genre } = await searchParams;
  const conditions = [];
  if (q) conditions.push(ilike(series.title, `%${q}%`));
  if (type) conditions.push(eq(series.type, type as any));

  let seriesList = await db
    .select({
      id: series.id,
      slug: series.slug,
      title: series.title,
      type: series.type,
      status: series.status,
      coverImage: series.coverImage,
    })
    .from(series)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(series.createdAt))
    .limit(50);

  if (genre) {
    const genreSeriesIds = await db
      .select({ seriesId: seriesGenres.seriesId })
      .from(seriesGenres)
      .innerJoin(genres, eq(seriesGenres.genreId, genres.id))
      .where(eq(genres.slug, genre));
    const ids = new Set(genreSeriesIds.map((g) => g.seriesId));
    seriesList = seriesList.filter((s) => ids.has(s.id));
  }

  const allGenres = await db.select().from(genres).orderBy(genres.name);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Browse Series</h1>
      <div className="space-y-4">
        <Suspense fallback={null}>
          <SearchBar />
        </Suspense>
        <Suspense fallback={null}>
          <TypeTabs basePath="/browse" />
        </Suspense>
        <div className="flex flex-wrap gap-2">
          {allGenres.map((g) => (
            <Link key={g.id} href={`/browse?genre=${g.slug}`}>
              <Badge
                variant={genre === g.slug ? "default" : "outline"}
                className="cursor-pointer"
              >
                {g.name}
              </Badge>
            </Link>
          ))}
        </div>
      </div>
      {seriesList.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No series found.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {seriesList.map((s) => (
            <SeriesCard key={s.id} {...s} />
          ))}
        </div>
      )}
    </div>
  );
}
