import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  // cacheComponents: true, // disabled: PPR causes blank page on Railway (hydration fails)
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      // MinIO (our object storage)
      { protocol: "https", hostname: "bucket-production-f7a2.up.railway.app" },
      // AniList CDN (fallback for images not yet migrated)
      { protocol: "https", hostname: "s4.anilist.co" },
      // TMDB
      { protocol: "https", hostname: "image.tmdb.org" },
    ],
  },
  headers: async () => [
    {
      // CDN cache public pages for 60s, stale-while-revalidate for 5 min
      source: "/:locale(th|en)/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, s-maxage=60, stale-while-revalidate=300",
        },
      ],
    },
    {
      // Cache API responses for 30s
      source: "/api/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, s-maxage=30, stale-while-revalidate=60",
        },
      ],
    },
  ],
};

export default withNextIntl(nextConfig);
