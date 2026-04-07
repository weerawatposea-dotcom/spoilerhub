import { db } from "@/db";
import {
  spoilers,
  series,
  users,
  votes,
  comments as commentsTable,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { SpoilerReveal } from "@/components/spoiler-reveal";
import { VoteButton } from "@/components/vote-button";
import { CommentSection } from "@/components/comment-section";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { auth } from "@/lib/auth";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function SpoilerContent({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const [spoiler] = await db
    .select({
      id: spoilers.id,
      title: spoilers.title,
      chapter: spoilers.chapter,
      upvoteCount: spoilers.upvoteCount,
      createdAt: spoilers.createdAt,
      seriesTitle: series.title,
      seriesSlug: series.slug,
      seriesType: series.type,
      authorName: users.name,
      authorId: users.id,
    })
    .from(spoilers)
    .innerJoin(series, eq(spoilers.seriesId, series.id))
    .innerJoin(users, eq(spoilers.authorId, users.id))
    .where(eq(spoilers.slug, slug))
    .limit(1);

  if (!spoiler) notFound();

  const session = await auth();
  const t = await getTranslations("SpoilerDetail");
  const tBreadcrumbs = await getTranslations("Breadcrumbs");

  let userVote: 1 | -1 | null = null;
  if (session?.user) {
    const [v] = await db
      .select({ value: votes.value })
      .from(votes)
      .where(
        and(
          eq(votes.spoilerId, spoiler.id),
          eq(votes.userId, session.user.id)
        )
      )
      .limit(1);
    userVote = (v?.value as 1 | -1) ?? null;
  }

  const commentList = await db
    .select({
      id: commentsTable.id,
      content: commentsTable.content,
      createdAt: commentsTable.createdAt,
      authorName: users.name,
      authorImage: users.image,
    })
    .from(commentsTable)
    .innerJoin(users, eq(commentsTable.authorId, users.id))
    .where(eq(commentsTable.spoilerId, spoiler.id))
    .orderBy(commentsTable.createdAt);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Breadcrumbs
        items={[
          { label: tBreadcrumbs("home"), href: "/" },
          {
            label: spoiler.seriesTitle,
            href: `/series/${spoiler.seriesSlug}`,
          },
          { label: t("chapter", { chapter: spoiler.chapter }), href: `/spoiler/${slug}` },
        ]}
      />
      <div>
        <Link
          href={`/series/${spoiler.seriesSlug}`}
          className="text-sm text-primary hover:underline"
        >
          {spoiler.seriesTitle}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{spoiler.title}</h1>
        <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
          <Badge variant="secondary">{spoiler.seriesType}</Badge>
          <span>{t("chapter", { chapter: spoiler.chapter })}</span>
          <span>{t("by", { author: spoiler.authorName })}</span>
          <span>+{spoiler.upvoteCount}</span>
        </div>
      </div>
      <SpoilerReveal
        spoilerId={spoiler.id}
        seriesTitle={spoiler.seriesTitle}
        chapter={spoiler.chapter}
      />
      <VoteButton
        spoilerId={spoiler.id}
        upvoteCount={spoiler.upvoteCount}
        userVote={userVote}
      />
      <CommentSection
        spoilerId={spoiler.id}
        comments={commentList}
        isLoggedIn={!!session?.user}
      />
    </div>
  );
}
