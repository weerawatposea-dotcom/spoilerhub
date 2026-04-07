import { db } from "@/db";
import { spoilers, series, users } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { SpoilerCard } from "@/components/spoiler-card";
import { TypeTabs } from "@/components/type-tabs";
import { JsonLd } from "@/components/json-ld";
import { Suspense } from "react";

async function getLatestSpoilers(typeFilter?: string) {
  "use cache";

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

  return (
    <div className="space-y-6">
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
      <div>
        <h1 className="text-2xl font-bold">Latest Spoilers</h1>
        <p className="text-muted-foreground text-sm">
          สปอยล์ตอนล่าสุดจากชุมชน
        </p>
      </div>
      <Suspense fallback={null}>
        <TypeTabs />
      </Suspense>
      <div className="space-y-2">
        {latestSpoilers.map((sp) => (
          <SpoilerCard
            key={sp.id}
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
        ))}
        {latestSpoilers.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">
            No spoilers yet. Be the first to write one!
          </p>
        )}
      </div>
    </div>
  );
}
