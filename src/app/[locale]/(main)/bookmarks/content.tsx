import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/db";
import { bookmarks, series } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { SeriesCard } from "@/components/series-card";
import { getTranslations, getLocale } from "next-intl/server";
import { getLocalizedTitle } from "@/lib/locale-content";

export async function BookmarksContent() {
  const session = await requireAuth();
  const locale = await getLocale();
  const t = await getTranslations("BookmarksPage");
  const myBookmarks = await db.select({
    slug: series.slug, title: series.title, titleTh: series.titleTh, type: series.type, status: series.status, coverImage: series.coverImage,
  }).from(bookmarks).innerJoin(series, eq(bookmarks.seriesId, series.id))
    .where(eq(bookmarks.userId, session.user.id)).orderBy(desc(bookmarks.createdAt));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      {myBookmarks.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {myBookmarks.map((s) => (<SeriesCard key={s.slug} {...s} title={getLocalizedTitle(s, locale)} />))}
        </div>
      )}
    </div>
  );
}
