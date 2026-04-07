import { db } from "@/db";
import { users, spoilers, series } from "@/db/schema";
import { eq, desc, count, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SpoilerCard } from "@/components/spoiler-card";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function ProfileContent({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id: userId } = await params;
  setRequestLocale(locale);
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) notFound();

  const t = await getTranslations("ProfilePage");

  const [spoilerCount] = await db
    .select({ count: count() })
    .from(spoilers)
    .where(eq(spoilers.authorId, userId));

  const [totalUpvotes] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${spoilers.upvoteCount}), 0)`,
    })
    .from(spoilers)
    .where(eq(spoilers.authorId, userId));

  const userSpoilers = await db
    .select({
      id: spoilers.id,
      slug: spoilers.slug,
      title: spoilers.title,
      chapter: spoilers.chapter,
      upvoteCount: spoilers.upvoteCount,
      createdAt: spoilers.createdAt,
      seriesTitle: series.title,
      seriesType: series.type,
      authorName: sql<string>`${user.name}`.as("authorName"),
      commentCount:
        sql<number>`(SELECT COUNT(*) FROM comments WHERE comments.spoiler_id = spoilers.id)`.as(
          "commentCount"
        ),
    })
    .from(spoilers)
    .innerJoin(series, eq(spoilers.seriesId, series.id))
    .where(eq(spoilers.authorId, userId))
    .orderBy(desc(spoilers.createdAt))
    .limit(20);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={user.image ?? undefined} />
          <AvatarFallback className="text-lg">
            {user.name?.charAt(0) ?? "U"}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">{user.name ?? t("anonymous")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("joined", { date: new Date(user.createdAt).toLocaleDateString("th-TH") })}
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {t("spoilersWritten")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{spoilerCount.count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {t("totalUpvotes")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalUpvotes.total}</p>
          </CardContent>
        </Card>
      </div>
      <div>
        <h2 className="mb-3 text-lg font-semibold">{t("recentSpoilers")}</h2>
        <div className="space-y-2">
          {userSpoilers.map((sp) => (
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
