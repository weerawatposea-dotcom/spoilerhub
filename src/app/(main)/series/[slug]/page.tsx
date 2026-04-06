import { db } from "@/db";
import { series, spoilers, users, seriesGenres, genres, bookmarks } from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { SpoilerCard } from "@/components/spoiler-card";
import { BookmarkButton } from "@/components/bookmark-button";
import { auth } from "@/lib/auth";
import type { Metadata } from "next";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [s] = await db.select().from(series).where(eq(series.slug, slug)).limit(1);
  if (!s) return {};
  return {
    title: `${s.title} สปอยล์ตอนล่าสุด`,
    description: s.synopsis ?? `อ่านสปอยล์ ${s.title} ตอนล่าสุด`,
    openGraph: { title: s.title, description: s.synopsis ?? undefined, images: s.coverImage ? [s.coverImage] : undefined },
    alternates: { canonical: `/series/${slug}` },
  };
}

export default async function SeriesDetailPage({ params }: Props) {
  "use cache";
  const { slug } = await params;
  const [s] = await db.select().from(series).where(eq(series.slug, slug)).limit(1);
  if (!s) notFound();

  const session = await auth();

  const seriesGenreList = await db.select({ name: genres.name, slug: genres.slug })
    .from(seriesGenres).innerJoin(genres, eq(seriesGenres.genreId, genres.id))
    .where(eq(seriesGenres.seriesId, s.id));

  const spoilerList = await db.select({
    id: spoilers.id, slug: spoilers.slug, title: spoilers.title,
    chapter: spoilers.chapter, upvoteCount: spoilers.upvoteCount,
    createdAt: spoilers.createdAt, seriesTitle: sql<string>`${s.title}`.as("seriesTitle"),
    seriesType: sql<string>`${s.type}`.as("seriesType"), authorName: users.name,
    commentCount: sql<number>`(SELECT COUNT(*) FROM comment WHERE comment."spoilerId" = spoiler.id)`.as("commentCount"),
  }).from(spoilers).innerJoin(users, eq(spoilers.authorId, users.id))
    .where(eq(spoilers.seriesId, s.id)).orderBy(desc(spoilers.createdAt));

  let isBookmarked = false;
  if (session?.user) {
    const [bm] = await db.select().from(bookmarks)
      .where(and(eq(bookmarks.userId, session.user.id), eq(bookmarks.seriesId, s.id))).limit(1);
    isBookmarked = !!bm;
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-6">
        {s.coverImage && <Image src={s.coverImage} alt={s.title} width={200} height={300} className="rounded-lg object-cover" />}
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between">
            <h1 className="text-2xl font-bold">{s.title}</h1>
            {session?.user && <BookmarkButton seriesId={s.id} isBookmarked={isBookmarked} />}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{s.type}</Badge>
            <Badge variant="outline">{s.status}</Badge>
            {seriesGenreList.map((g) => (<Badge key={g.slug} variant="outline">{g.name}</Badge>))}
          </div>
          {s.synopsis && <p className="text-sm text-muted-foreground">{s.synopsis}</p>}
        </div>
      </div>
      <div>
        <h2 className="mb-3 text-lg font-semibold">Spoilers ({spoilerList.length})</h2>
        <div className="space-y-2">
          {spoilerList.map((sp) => (
            <SpoilerCard key={sp.id} slug={sp.slug} title={sp.title} chapter={sp.chapter}
              seriesTitle={sp.seriesTitle} seriesType={sp.seriesType} authorName={sp.authorName}
              upvoteCount={sp.upvoteCount} commentCount={Number(sp.commentCount)} createdAt={sp.createdAt} />
          ))}
        </div>
      </div>
    </div>
  );
}
