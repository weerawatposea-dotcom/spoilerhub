import { Suspense } from "react";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { CardGridLoading } from "@/components/loading";
import { BrowseContent } from "./content";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; type?: string; genre?: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const params = await searchParams;
  const t = await getTranslations("BrowsePage");
  return {
    title: params.type
      ? t("metaTitle", { type: params.type })
      : t("metaTitleDefault"),
    description:
      "สำรวจและค้นหาสปอยล์ anime manga manhwa manhua novel ตอนล่าสุด",
    alternates: { canonical: "/browse" },
  };
}

export default async function BrowsePage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense fallback={<CardGridLoading />}>
      <BrowseContent searchParams={searchParams} />
    </Suspense>
  );
}
