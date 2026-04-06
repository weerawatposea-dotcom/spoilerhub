import { db } from "@/db";
import { spoilers, series, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SpoilerReveal } from "@/components/spoiler-reveal";
import type { Metadata } from "next";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [spoiler] = await db.select({ title: spoilers.title, chapter: spoilers.chapter, seriesTitle: series.title })
    .from(spoilers).innerJoin(series, eq(spoilers.seriesId, series.id)).where(eq(spoilers.slug, slug)).limit(1);
  if (!spoiler) return {};
  return {
    title: `สปอยล์ ${spoiler.seriesTitle} ตอนที่ ${spoiler.chapter}`,
    description: `${spoiler.title} — อ่านสปอยล์ ${spoiler.seriesTitle} ตอนที่ ${spoiler.chapter}`,
    openGraph: {
      title: `สปอยล์ ${spoiler.seriesTitle} ตอนที่ ${spoiler.chapter}`,
      description: spoiler.title,
      images: [`/api/og?title=${encodeURIComponent(spoiler.seriesTitle)}&chapter=${spoiler.chapter}`],
    },
    alternates: { canonical: `/spoiler/${slug}` },
  };
}

export default async function SpoilerViewPage({ params }: Props) {
  "use cache";
  const { slug } = await params;

  const [spoiler] = await db.select({
    id: spoilers.id, title: spoilers.title, chapter: spoilers.chapter,
    upvoteCount: spoilers.upvoteCount, createdAt: spoilers.createdAt,
    seriesTitle: series.title, seriesSlug: series.slug, seriesType: series.type,
    authorName: users.name, authorId: users.id,
  }).from(spoilers).innerJoin(series, eq(spoilers.seriesId, series.id))
    .innerJoin(users, eq(spoilers.authorId, users.id)).where(eq(spoilers.slug, slug)).limit(1);

  if (!spoiler) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href={`/series/${spoiler.seriesSlug}`} className="text-sm text-primary hover:underline">{spoiler.seriesTitle}</Link>
        <h1 className="mt-1 text-2xl font-bold">{spoiler.title}</h1>
        <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
          <Badge variant="secondary">{spoiler.seriesType}</Badge>
          <span>Ch. {spoiler.chapter}</span>
          <span>by {spoiler.authorName}</span>
          <span>+{spoiler.upvoteCount}</span>
        </div>
      </div>
      <SpoilerReveal spoilerId={spoiler.id} seriesTitle={spoiler.seriesTitle} chapter={spoiler.chapter} />
    </div>
  );
}
