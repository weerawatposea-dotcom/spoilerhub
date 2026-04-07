import { db } from "@/db";
import { series, spoilers } from "@/db/schema";
import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://spoilerhub.com";
const locales = ["th", "en"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const allSeries = await db
    .select({ slug: series.slug, createdAt: series.createdAt })
    .from(series);
  const allSpoilers = await db
    .select({ slug: spoilers.slug, createdAt: spoilers.createdAt })
    .from(spoilers);

  const staticPages = [
    { path: "", changeFrequency: "hourly" as const, priority: 1 },
    { path: "/browse", changeFrequency: "daily" as const, priority: 0.8 },
  ];

  const entries: MetadataRoute.Sitemap = [];

  // Static pages for each locale
  for (const page of staticPages) {
    for (const locale of locales) {
      entries.push({
        url: `${BASE_URL}/${locale}${page.path}`,
        lastModified: new Date(),
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${BASE_URL}/${l}${page.path}`])
          ),
        },
      });
    }
  }

  // Series pages for each locale
  for (const s of allSeries) {
    for (const locale of locales) {
      entries.push({
        url: `${BASE_URL}/${locale}/series/${s.slug}`,
        lastModified: s.createdAt,
        changeFrequency: "daily",
        priority: 0.7,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${BASE_URL}/${l}/series/${s.slug}`])
          ),
        },
      });
    }
  }

  // Spoiler pages for each locale
  for (const s of allSpoilers) {
    for (const locale of locales) {
      entries.push({
        url: `${BASE_URL}/${locale}/spoiler/${s.slug}`,
        lastModified: s.createdAt,
        changeFrequency: "weekly",
        priority: 0.6,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${BASE_URL}/${l}/spoiler/${s.slug}`])
          ),
        },
      });
    }
  }

  return entries;
}
