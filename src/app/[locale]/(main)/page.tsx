import { Suspense } from "react";
import { PageLoading } from "@/components/loading";
import { HomeContent } from "./home-content";

export default function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  return (
    <Suspense fallback={<PageLoading />}>
      <HomeContent searchParams={searchParams} />
    </Suspense>
  );
}
