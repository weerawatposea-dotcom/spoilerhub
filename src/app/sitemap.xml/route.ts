import { db } from "@/db";
import { series, spoilers } from "@/db/schema";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://spoilerhub.com";
const locales = ["th", "en"] as const;

/**
 * Dynamic sitemap route — generates XML at runtime (not build time)
 * This avoids the build-time DB access issue in Docker
 */
export async function GET() {
  const allSeries = await db
    .select({ slug: series.slug, createdAt: series.createdAt })
    .from(series);
  const allSpoilers = await db
    .select({ slug: spoilers.slug, createdAt: spoilers.createdAt })
    .from(spoilers);

  const urls: string[] = [];

  // Static pages
  for (const path of ["", "/browse"]) {
    for (const locale of locales) {
      urls.push(`
  <url>
    <loc>${BASE_URL}/${locale}${path}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${path === "" ? "hourly" : "daily"}</changefreq>
    <priority>${path === "" ? "1.0" : "0.8"}</priority>
    ${locales.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${BASE_URL}/${l}${path}" />`).join("\n    ")}
  </url>`);
    }
  }

  // Series pages
  for (const s of allSeries) {
    for (const locale of locales) {
      urls.push(`
  <url>
    <loc>${BASE_URL}/${locale}/series/${s.slug}</loc>
    <lastmod>${s.createdAt?.toISOString() ?? new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    ${locales.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${BASE_URL}/${l}/series/${s.slug}" />`).join("\n    ")}
  </url>`);
    }
  }

  // Spoiler pages
  for (const s of allSpoilers) {
    for (const locale of locales) {
      urls.push(`
  <url>
    <loc>${BASE_URL}/${locale}/spoiler/${s.slug}</loc>
    <lastmod>${s.createdAt?.toISOString() ?? new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
    ${locales.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${BASE_URL}/${l}/spoiler/${s.slug}" />`).join("\n    ")}
  </url>`);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
