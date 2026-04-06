import { db } from "@/db";
import { series, spoilers } from "@/db/schema";
import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://spoilerhub.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const allSeries = await db.select({ slug: series.slug, createdAt: series.createdAt }).from(series);
  const allSpoilers = await db.select({ slug: spoilers.slug, createdAt: spoilers.createdAt }).from(spoilers);

  return [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "hourly", priority: 1 },
    { url: `${BASE_URL}/browse`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    ...allSeries.map((s) => ({
      url: `${BASE_URL}/series/${s.slug}`, lastModified: s.createdAt, changeFrequency: "daily" as const, priority: 0.7,
    })),
    ...allSpoilers.map((s) => ({
      url: `${BASE_URL}/spoiler/${s.slug}`, lastModified: s.createdAt, changeFrequency: "weekly" as const, priority: 0.6,
    })),
  ];
}
