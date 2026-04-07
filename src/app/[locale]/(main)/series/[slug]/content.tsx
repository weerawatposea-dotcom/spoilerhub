import { db } from "@/db";
import {
  series,
  spoilers,
  users,
  seriesGenres,
  genres,
  bookmarks,
} from "@/db/schema";
import { eq, desc, sql, and, count } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { SpoilerCard } from "@/components/spoiler-card";
import { Pagination } from "@/components/pagination";
import { BookmarkButton } from "@/components/bookmark-button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { auth } from "@/lib/auth";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLocalizedTitle, getLocalizedSynopsis } from "@/lib/locale-content";
import { cached } from "@/lib/cache";

const TYPE_GRADIENT: Record<string, string> = {
  anime: "from-blue-500/20 to-transparent",
  manga: "from-red-500/20 to-transparent",
  manhwa: "from-emerald-500/20 to-transparent",
  manhua: "from-amber-500/20 to-transparent",
  novel: "from-violet-500/20 to-transparent",
  other: "from-slate-500/20 to-transparent",
};

const SPOILERS_PER_PAGE = 10;

export async function SeriesContent({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale, slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const offset = (page - 1) * SPOILERS_PER_PAGE;
  setRequestLocale(locale);
  const [s] = await cached(`series:${slug}`, 300, () =>
    db
      .select()
      .from(series)
      .where(eq(series.slug, slug))
      .limit(1)
  );
  if (!s) notFound();

  const session = await auth();
  const t = await getTranslations("SeriesDetail");
  const tBreadcrumbs = await getTranslations("Breadcrumbs");

  const displayTitle = getLocalizedTitle(s, locale);
  const displaySynopsis = getLocalizedSynopsis(s, locale);

  const seriesGenreList = await cached(`series-genres:${s.id}`, 300, () =>
    db
      .select({ name: genres.name, slug: genres.slug })
      .from(seriesGenres)
      .innerJoin(genres, eq(seriesGenres.genreId, genres.id))
      .where(eq(seriesGenres.seriesId, s.id))
  );

  const [spoilerList, totalSpoilers] = await cached(
    `series-spoilers:${s.id}:p${page}`,
    60,
    async () => {
      const [list, countResult] = await Promise.all([
        db
          .select({
            id: spoilers.id,
            slug: spoilers.slug,
            title: spoilers.title,
            chapter: spoilers.chapter,
            upvoteCount: spoilers.upvoteCount,
            createdAt: spoilers.createdAt,
            seriesTitle: sql<string>`${s.title}`.as("seriesTitle"),
            seriesType: sql<string>`${s.type}`.as("seriesType"),
            authorName: users.name,
            commentCount:
              sql<number>`(SELECT COUNT(*) FROM comments WHERE comments.spoiler_id = spoilers.id)`.as(
                "commentCount"
              ),
          })
          .from(spoilers)
          .innerJoin(users, eq(spoilers.authorId, users.id))
          .where(eq(spoilers.seriesId, s.id))
          .orderBy(desc(spoilers.createdAt))
          .limit(SPOILERS_PER_PAGE)
          .offset(offset),
        db
          .select({ count: count() })
          .from(spoilers)
          .where(eq(spoilers.seriesId, s.id)),
      ]);
      return [list, countResult[0].count] as const;
    }
  );
  const totalPages = Math.ceil(totalSpoilers / SPOILERS_PER_PAGE);

  let isBookmarked = false;
  if (session?.user) {
    const [bm] = await db
      .select()
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.userId, session.user.id),
          eq(bookmarks.seriesId, s.id)
        )
      )
      .limit(1);
    isBookmarked = !!bm;
  }

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: tBreadcrumbs("home"), href: "/" },
          { label: s.type, href: `/browse?type=${s.type}` },
          { label: displayTitle, href: `/series/${s.slug}` },
        ]}
      />

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/30 bg-card">
        {/* Background gradient based on series type */}
        <div
          className={`absolute inset-0 bg-gradient-to-r ${TYPE_GRADIENT[s.type] ?? TYPE_GRADIENT.other} dark:opacity-50`}
        />

        <div className="relative flex gap-6 p-6 md:p-8">
          {/* Cover */}
          {s.coverImage && (
            <div className="hidden shrink-0 sm:block">
              <div className="relative h-[280px] w-[190px] overflow-hidden rounded-xl shadow-2xl shadow-black/20 ring-1 ring-white/10">
                <Image
                  src={s.coverImage}
                  alt={s.title}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          )}

          {/* Info */}
          <div className="flex flex-1 flex-col justify-center space-y-4">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                {displayTitle}
              </h1>
              {session?.user && (
                <BookmarkButton seriesId={s.id} isBookmarked={isBookmarked} />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="font-semibold uppercase text-[10px] tracking-wider"
              >
                {s.type}
              </Badge>
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  s.status === "ongoing"
                    ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    : s.status === "completed"
                      ? "border-blue-500/30 text-blue-600 dark:text-blue-400"
                      : "text-muted-foreground"
                }`}
              >
                {s.status === "ongoing" && "● "}
                {s.status}
              </Badge>
              {seriesGenreList.map((g) => (
                <Badge key={g.slug} variant="outline" className="text-[10px]">
                  {g.name}
                </Badge>
              ))}
            </div>

            {displaySynopsis && (
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {displaySynopsis}
              </p>
            )}

            {/* Stats bar */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14,2 14,8 20,8" />
                </svg>
                {totalSpoilers} spoilers
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Spoiler List */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">
          {t("spoilersHeading", { count: totalSpoilers })}
        </h2>
        <div className="space-y-3">
          {spoilerList.map((sp) => (
            <SpoilerCard
              key={sp.id}
              slug={sp.slug}
              title={sp.title}
              chapter={sp.chapter}
              seriesTitle={sp.seriesTitle}
              seriesType={sp.seriesType}
              authorName={sp.authorName}
              upvoteCount={sp.upvoteCount}
              commentCount={Number(sp.commentCount)}
              createdAt={sp.createdAt}
            />
          ))}
        </div>

        <Suspense fallback={null}>
          <Pagination currentPage={page} totalPages={totalPages} />
        </Suspense>
      </div>
    </div>
  );
}
