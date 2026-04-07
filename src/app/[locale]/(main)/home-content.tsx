import { db } from "@/db";
import { spoilers, series, users } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { SpoilerCard } from "@/components/spoiler-card";
import { TypeTabs } from "@/components/type-tabs";
import { JsonLd } from "@/components/json-ld";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

async function getLatestSpoilers(typeFilter?: string) {
  return db
    .select({
      id: spoilers.id,
      slug: spoilers.slug,
      title: spoilers.title,
      chapter: spoilers.chapter,
      upvoteCount: spoilers.upvoteCount,
      createdAt: spoilers.createdAt,
      seriesTitle: series.title,
      seriesType: series.type,
      authorName: users.name,
      commentCount:
        sql<number>`(SELECT COUNT(*) FROM comments WHERE comments.spoiler_id = spoilers.id)`.as(
          "commentCount"
        ),
    })
    .from(spoilers)
    .innerJoin(series, eq(spoilers.seriesId, series.id))
    .innerJoin(users, eq(spoilers.authorId, users.id))
    .where(typeFilter ? eq(series.type, typeFilter as any) : undefined)
    .orderBy(desc(spoilers.createdAt))
    .limit(20);
}

export async function HomeContent({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const latestSpoilers = await getLatestSpoilers(params.type);
  const t = await getTranslations("HomePage");

  return (
    <div className="space-y-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "SpoilerHub",
          url: process.env.NEXT_PUBLIC_APP_URL,
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: `${process.env.NEXT_PUBLIC_APP_URL}/browse?q={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
          },
        }}
      />

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl border border-border/30 bg-gradient-to-br from-card via-card to-muted/30 p-8 dark:from-card dark:via-card dark:to-muted/10">
        {/* Decorative grid */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.06]">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hero-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M32 0H0v32" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-grid)" />
          </svg>
        </div>
        {/* Accent blob */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-red-500/10 blur-3xl dark:bg-red-500/5" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/5" />

        <div className="relative">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-red-500 dark:text-red-400">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13.5 2c-5.621 0-10.211 4.443-10.484 10h-3.016l5 6.625 5-6.625h-2.937c.272-3.894 3.512-7 7.437-7 4.141 0 7.5 3.359 7.5 7.5s-3.359 7.5-7.5 7.5a7.462 7.462 0 0 1-4.798-1.74l-1.489 1.483A9.964 9.964 0 0 0 13.5 22c5.523 0 10-4.477 10-10s-4.477-10-10-10z" />
            </svg>
            LATEST UPDATES
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <Suspense fallback={null}>
        <TypeTabs />
      </Suspense>

      {/* Spoiler Feed */}
      <div className="space-y-3">
        {latestSpoilers.map((sp, i) => (
          <div
            key={sp.id}
            style={{ animationDelay: `${i * 50}ms` }}
            className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
          >
            <SpoilerCard
              slug={sp.slug}
              title={sp.title}
              chapter={sp.chapter}
              seriesTitle={sp.seriesTitle}
              seriesType={sp.seriesType}
              authorName={sp.authorName}
              upvoteCount={sp.upvoteCount}
              commentCount={Number(sp.commentCount)}
              createdAt={sp.createdAt}
            />
          </div>
        ))}
        {latestSpoilers.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 py-20 text-center">
            <svg
              className="h-12 w-12 text-muted-foreground/30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            >
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
              <line x1="2" y1="2" x2="22" y2="22" />
            </svg>
            <p className="mt-4 text-sm text-muted-foreground">{t("empty")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
