import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://spoilerhub.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api",
          "*/admin",
          "*/bookmarks",
          "*/notifications",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
