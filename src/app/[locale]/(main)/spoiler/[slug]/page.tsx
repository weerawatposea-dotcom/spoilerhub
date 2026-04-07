import { Suspense } from "react";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { PageLoading } from "@/components/loading";
import { SpoilerContent } from "./content";
import type { Metadata } from "next";
import { db } from "@/db";
import { spoilers, series } from "@/db/schema";
import { eq } from "drizzle-orm";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTranslations("SpoilerDetail");
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
    title: t("metaTitle", { series: spoiler.seriesTitle, chapter: spoiler.chapter }),
    description: t("metaDescription", { title: spoiler.title, series: spoiler.seriesTitle, chapter: spoiler.chapter }),
    openGraph: {
      title: t("metaTitle", { series: spoiler.seriesTitle, chapter: spoiler.chapter }),
      description: spoiler.title,
      images: [
        `/api/og?title=${encodeURIComponent(spoiler.seriesTitle)}&chapter=${spoiler.chapter}`,
      ],
    },
    alternates: { canonical: `/spoiler/${slug}` },
  };
}

export default async function SpoilerViewPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense fallback={<PageLoading />}>
      <SpoilerContent params={params} />
    </Suspense>
  );
}
