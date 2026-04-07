import { Suspense } from "react";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SeriesDetailLoading } from "@/components/loading";
import { SeriesContent } from "./content";
import type { Metadata } from "next";
import { db } from "@/db";
import { series } from "@/db/schema";
import { eq } from "drizzle-orm";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTranslations("SeriesDetail");
  const [s] = await db
    .select()
    .from(series)
    .where(eq(series.slug, slug))
    .limit(1);
  if (!s) return {};
  return {
    title: t("metaTitle", { title: s.title }),
    description: s.synopsis ?? t("metaDescription", { title: s.title }),
    openGraph: {
      title: s.title,
      description: s.synopsis ?? undefined,
      images: s.coverImage ? [s.coverImage] : undefined,
    },
    alternates: { canonical: `/series/${slug}` },
  };
}

export default async function SeriesDetailPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense fallback={<SeriesDetailLoading />}>
      <SeriesContent params={params} />
    </Suspense>
  );
}
