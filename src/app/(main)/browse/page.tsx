import { Suspense } from "react";
import { CardGridLoading } from "@/components/loading";
import { BrowseContent } from "./content";
import type { Metadata } from "next";

interface Props {
  searchParams: Promise<{ q?: string; type?: string; genre?: string }>;
}

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const params = await searchParams;
  return {
    title: params.type
      ? `สปอยล์ ${params.type} ยอดนิยม`
      : "Browse — สำรวจสปอยล์ทุกเรื่อง",
    description:
      "สำรวจและค้นหาสปอยล์ anime manga manhwa manhua novel ตอนล่าสุด",
    alternates: { canonical: "/browse" },
  };
}

export default function BrowsePage({ searchParams }: Props) {
  return (
    <Suspense fallback={<CardGridLoading />}>
      <BrowseContent searchParams={searchParams} />
    </Suspense>
  );
}
