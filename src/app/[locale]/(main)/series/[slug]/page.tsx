import { Suspense } from "react";
import { SeriesDetailLoading } from "@/components/loading";
import { SeriesContent } from "./content";
import type { Metadata } from "next";
import { db } from "@/db";
import { series } from "@/db/schema";
import { eq } from "drizzle-orm";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [s] = await db
    .select()
    .from(series)
    .where(eq(series.slug, slug))
    .limit(1);
  if (!s) return {};
  return {
    title: `${s.title} สปอยล์ตอนล่าสุด`,
    description: s.synopsis ?? `อ่านสปอยล์ ${s.title} ตอนล่าสุด`,
    openGraph: {
      title: s.title,
      description: s.synopsis ?? undefined,
      images: s.coverImage ? [s.coverImage] : undefined,
    },
    alternates: { canonical: `/series/${slug}` },
  };
}

export default function SeriesDetailPage({ params }: Props) {
  return (
    <Suspense fallback={<SeriesDetailLoading />}>
      <SeriesContent params={params} />
    </Suspense>
  );
}
