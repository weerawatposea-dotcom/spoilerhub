import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { PageLoading } from "@/components/loading";
import { SpoilerContent } from "./content";
import type { Metadata } from "next";
import { db } from "@/db";
import { spoilers, series } from "@/db/schema";
import { eq } from "drizzle-orm";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

async function getSpoilerForMeta(slug: string) {
  "use cache";
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
  return spoiler ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTranslations("SpoilerDetail");
  const spoiler = await getSpoilerForMeta(slug);
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

async function Connection() {
  await connection();
  return null;
}

function DynamicMarker() {
  return (
    <Suspense>
      <Connection />
    </Suspense>
  );
}

export default function SpoilerViewPage({ params }: Props) {
  return (
    <>
      <DynamicMarker />
      <Suspense fallback={<PageLoading />}>
        <SpoilerContent params={params} />
      </Suspense>
    </>
  );
}
