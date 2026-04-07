import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { SeriesDetailLoading } from "@/components/loading";
import { SeriesContent } from "./content";
import type { Metadata } from "next";
import { db } from "@/db";
import { series } from "@/db/schema";
import { eq } from "drizzle-orm";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

async function getSeriesForMeta(slug: string) {
  "use cache";
  const [s] = await db.select().from(series).where(eq(series.slug, slug)).limit(1);
  return s ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTranslations("SeriesDetail");
  const s = await getSeriesForMeta(slug);
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

export default function SeriesDetailPage({ params }: Props) {
  return (
    <>
      <DynamicMarker />
      <Suspense fallback={<SeriesDetailLoading />}>
        <SeriesContent params={params} />
      </Suspense>
    </>
  );
}
