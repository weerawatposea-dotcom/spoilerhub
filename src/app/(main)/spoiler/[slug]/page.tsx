import { Suspense } from "react";
import { PageLoading } from "@/components/loading";
import { SpoilerContent } from "./content";
import type { Metadata } from "next";
import { db } from "@/db";
import { spoilers, series } from "@/db/schema";
import { eq } from "drizzle-orm";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [spoiler] = await db
    .select({
      title: spoilers.title,
      chapter: spoilers.chapter,
      seriesTitle: series.title,
    })
    .from(spoilers)
    .innerJoin(series, eq(spoilers.seriesId, series.id))
    .where(eq(spoilers.slug, slug))
    .limit(1);
  if (!spoiler) return {};
  return {
    title: `สปอยล์ ${spoiler.seriesTitle} ตอนที่ ${spoiler.chapter}`,
    description: `${spoiler.title} — อ่านสปอยล์ ${spoiler.seriesTitle} ตอนที่ ${spoiler.chapter}`,
    openGraph: {
      title: `สปอยล์ ${spoiler.seriesTitle} ตอนที่ ${spoiler.chapter}`,
      description: spoiler.title,
      images: [
        `/api/og?title=${encodeURIComponent(spoiler.seriesTitle)}&chapter=${spoiler.chapter}`,
      ],
    },
    alternates: { canonical: `/spoiler/${slug}` },
  };
}

export default function SpoilerViewPage({ params }: Props) {
  return (
    <Suspense fallback={<PageLoading />}>
      <SpoilerContent params={params} />
    </Suspense>
  );
}
