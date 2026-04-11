import { db } from "@/db";
import { series, spoilers, genres, users } from "@/db/schema";
import { desc, eq, count, sql } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { cached } from "@/lib/cache";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { getLocalizedTitle } from "@/lib/locale-content";
import Image from "next/image";
import { RelativeTime } from "./relative-time";

// ─── Data fetchers ───────────────────────────────

async function getTopSpoilers() {
  return cached("sidebar:top-spoilers", 300, () =>
    db
      .select({
        slug: spoilers.slug,
        title: spoilers.title,
        chapter: spoilers.chapter,
        upvoteCount: spoilers.upvoteCount,
        createdAt: spoilers.createdAt,
        seriesTitle: series.title,
        seriesTitleTh: series.titleTh,
        seriesType: series.type,
        seriesCover: series.coverImage,
      })
      .from(spoilers)
      .innerJoin(series, eq(spoilers.seriesId, series.id))
      .orderBy(desc(spoilers.upvoteCount))
      .limit(5)
  );
}

async function getGenreStats() {
  return cached("sidebar:genres", 3600, () =>
    db
      .select({ name: genres.name, slug: genres.slug })
      .from(genres)
      .orderBy(genres.name)
  );
}

async function getTopContributors() {
  return cached("sidebar:contributors", 300, () =>
    db
      .select({
        name: users.name,
        image: users.image,
        id: users.id,
        spoilerCount: count(spoilers.id),
      })
      .from(users)
      .innerJoin(spoilers, eq(users.id, spoilers.authorId))
      .groupBy(users.id, users.name, users.image)
      .orderBy(desc(count(spoilers.id)))
      .limit(5)
  );
}

async function getRecentSeries() {
  return cached("sidebar:recent-series", 300, () =>
    db
      .select({
        slug: series.slug,
        title: series.title,
        titleTh: series.titleTh,
        type: series.type,
        coverImage: series.coverImage,
      })
      .from(series)
      .where(eq(series.status, "ongoing"))
      .orderBy(desc(series.createdAt))
      .limit(5)
  );
}

// ─── Type color map ──────────────────────────────

const TYPE_DOT: Record<string, string> = {
  anime: "bg-blue-500",
  manga: "bg-red-500",
  manhwa: "bg-emerald-500",
  manhua: "bg-amber-500",
  novel: "bg-violet-500",
  other: "bg-slate-500",
  movie: "bg-pink-500",
  tv_series: "bg-cyan-500",
  drama: "bg-rose-500",
};

// ─── Component ───────────────────────────────────

export async function Sidebar() {
  // Signal to Next.js this component needs runtime data (prevents prerender in Docker)
  await connection();
  const locale = await getLocale();
  const t = await getTranslations("Sidebar");

  const [topSpoilers, allGenres, contributors, recentSeries] =
    await Promise.all([
      getTopSpoilers(),
      getGenreStats(),
      getTopContributors(),
      getRecentSeries(),
    ]);

  return (
    <aside className="space-y-6">
      {/* 🔥 Top Spoilers Ranking */}
      <div className="rounded-xl border border-border/30 bg-card/50 p-4 dark:bg-card/30">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <svg
            className="h-4 w-4 text-red-500"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
          {t("topSpoilers")}
        </h3>
        <div className="space-y-2.5">
          {topSpoilers.map((sp, i) => (
            <Link
              key={sp.slug}
              href={`/spoiler/${sp.slug}`}
              className="group flex items-start gap-2.5"
            >
              {/* Rank number */}
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold ${
                  i === 0
                    ? "bg-red-500/20 text-red-500"
                    : i === 1
                      ? "bg-orange-500/20 text-orange-500"
                      : i === 2
                        ? "bg-amber-500/20 text-amber-500"
                        : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium group-hover:text-primary transition-colors">
                  {getLocalizedTitle({ title: sp.seriesTitle, titleTh: sp.seriesTitleTh }, locale)}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  Ch.{sp.chapter} · +{sp.upvoteCount}
                </p>
                <RelativeTime date={sp.createdAt} className="text-[10px] text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 📺 Recently Updated (ongoing) */}
      <div className="rounded-xl border border-border/30 bg-card/50 p-4 dark:bg-card/30">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <svg
            className="h-4 w-4 text-emerald-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12,6 12,12 16,14" />
          </svg>
          {t("ongoingSeries")}
        </h3>
        <div className="space-y-2">
          {recentSeries.map((s) => (
            <Link
              key={s.slug}
              href={`/series/${s.slug}`}
              className="group flex items-center gap-2.5"
            >
              {/* Mini cover */}
              <div className="relative h-10 w-7 shrink-0 overflow-hidden rounded bg-muted">
                {s.coverImage ? (
                  <Image
                    src={s.coverImage}
                    alt={getLocalizedTitle(s, locale)}
                    fill
                    className="object-cover"
                    sizes="28px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[8px] text-muted-foreground">
                    ?
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium group-hover:text-primary transition-colors">
                  {getLocalizedTitle(s, locale)}
                </p>
                <div className="flex items-center gap-1">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${TYPE_DOT[s.type] ?? TYPE_DOT.other}`}
                  />
                  <span className="text-[10px] text-muted-foreground capitalize">
                    {s.type}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 🏷️ Genres */}
      <div className="rounded-xl border border-border/30 bg-card/50 p-4 dark:bg-card/30">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <svg
            className="h-4 w-4 text-violet-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
          {t("genres")}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {allGenres.map((g) => (
            <Link key={g.slug} href={`/browse?genre=${g.slug}`}>
              <Badge
                variant="outline"
                className="cursor-pointer text-[10px] transition-all hover:bg-muted hover:scale-105"
              >
                {g.name}
              </Badge>
            </Link>
          ))}
        </div>
      </div>

      {/* 👥 Top Contributors */}
      <div className="rounded-xl border border-border/30 bg-card/50 p-4 dark:bg-card/30">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <svg
            className="h-4 w-4 text-blue-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          {t("topContributors")}
        </h3>
        <div className="space-y-2">
          {contributors.map((u, i) => (
            <Link
              key={u.id}
              href={`/profile/${u.id}`}
              className="group flex items-center gap-2.5"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                {u.name?.charAt(0) ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium group-hover:text-primary transition-colors">
                  {u.name ?? "Anonymous"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {u.spoilerCount} spoilers
                </p>
              </div>
              {i < 3 && (
                <span className="text-[10px]">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
