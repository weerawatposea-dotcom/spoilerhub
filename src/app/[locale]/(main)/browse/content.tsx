import { db } from "@/db";
import { series, seriesGenres, genres } from "@/db/schema";
import { eq, ilike, and, desc } from "drizzle-orm";
import { cached } from "@/lib/cache";
import { SeriesCard } from "@/components/series-card";
import { SearchBar } from "@/components/search-bar";
import { TypeTabs } from "@/components/type-tabs";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

export async function BrowseContent({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; genre?: string }>;
}) {
  const { q, type, genre } = await searchParams;
  const t = await getTranslations("BrowsePage");
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

  const allGenres = await cached("genres:all", 3600, () =>
    db.select().from(genres).orderBy(genres.name)
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {seriesList.length} series
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <Suspense fallback={null}>
          <SearchBar />
        </Suspense>
        <Suspense fallback={null}>
          <TypeTabs basePath="/browse" />
        </Suspense>

        {/* Genre chips */}
        <div className="flex flex-wrap gap-1.5">
          {allGenres.map((g) => (
            <Link key={g.id} href={`/browse?genre=${g.slug}`}>
              <Badge
                variant={genre === g.slug ? "default" : "outline"}
                className={`cursor-pointer text-[11px] transition-all hover:scale-105 ${
                  genre === g.slug
                    ? "shadow-sm"
                    : "hover:bg-muted"
                }`}
              >
                {g.name}
              </Badge>
            </Link>
          ))}
        </div>
      </div>

      {/* Results */}
      {seriesList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 py-20 text-center">
          <svg
            className="h-12 w-12 text-muted-foreground/30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
            <path d="M8 11h6" />
          </svg>
          <p className="mt-4 text-sm text-muted-foreground">{t("noResults")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {seriesList.map((s, i) => (
            <div
              key={s.id}
              style={{ animationDelay: `${i * 60}ms` }}
              className="animate-in fade-in slide-in-from-bottom-3 fill-mode-both"
            >
              <SeriesCard {...s} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
