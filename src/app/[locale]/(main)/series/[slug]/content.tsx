import { db } from "@/db";
import {
  series,
  spoilers,
  users,
  seriesGenres,
  genres,
  bookmarks,
} from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { SpoilerCard } from "@/components/spoiler-card";
import { BookmarkButton } from "@/components/bookmark-button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";

const TYPE_GRADIENT: Record<string, string> = {
  anime: "from-blue-500/20 to-transparent",
  manga: "from-red-500/20 to-transparent",
  manhwa: "from-emerald-500/20 to-transparent",
  manhua: "from-amber-500/20 to-transparent",
  novel: "from-violet-500/20 to-transparent",
  other: "from-slate-500/20 to-transparent",
};

export async function SeriesContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [s] = await db
    .select()
    .from(series)
    .where(eq(series.slug, slug))
    .limit(1);
  if (!s) notFound();

  const session = await auth();
  const t = await getTranslations("SeriesDetail");
  const tBreadcrumbs = await getTranslations("Breadcrumbs");

  const seriesGenreList = await db
    .select({ name: genres.name, slug: genres.slug })
    .from(seriesGenres)
    .innerJoin(genres, eq(seriesGenres.genreId, genres.id))
    .where(eq(seriesGenres.seriesId, s.id));

  const spoilerList = await db
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
    .orderBy(desc(spoilers.createdAt));

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
          { label: s.title, href: `/series/${s.slug}` },
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
                {s.title}
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

            {s.synopsis && (
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {s.synopsis}
              </p>
            )}

            {/* Stats bar */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14,2 14,8 20,8" />
                </svg>
                {spoilerList.length} spoilers
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Spoiler List */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">
          {t("spoilersHeading", { count: spoilerList.length })}
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
      </div>
    </div>
  );
}
