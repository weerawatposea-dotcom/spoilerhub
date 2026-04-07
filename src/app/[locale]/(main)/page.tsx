import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { PageLoading } from "@/components/loading";
import { Skeleton } from "@/components/ui/skeleton";
import { HomeContent } from "./home-content";
import { Sidebar } from "@/components/sidebar";

// No generateStaticParams — this page queries DB so must render at request time
// (Docker build has no DB access)

function SidebarLoading() {
  return (
    <aside className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-border/30 bg-card/50 p-4"
        >
          <Skeleton className="mb-3 h-4 w-24" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        </div>
      ))}
    </aside>
  );
}

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string; page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      {/* Main Content */}
      <div className="min-w-0 flex-1">
        <Suspense fallback={<PageLoading />}>
          <HomeContent searchParams={searchParams} />
        </Suspense>
      </div>

      {/* Sidebar — hidden on mobile, visible on lg+ */}
      <div className="w-full shrink-0 lg:w-72 xl:w-80">
        <div className="lg:sticky lg:top-20">
          <Suspense fallback={<SidebarLoading />}>
            <Sidebar />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
