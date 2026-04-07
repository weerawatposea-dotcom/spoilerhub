/**
 * AniList GraphQL API Client
 *
 * Endpoint: https://graphql.anilist.co (POST, no API key required)
 * Rate limit: 90 requests/minute
 * Docs: https://docs.anilist.co/
 */

const ANILIST_API = "https://graphql.anilist.co";

// ─── Types ───────────────────────────────────────

export interface AniListMedia {
  id: number;
  title: {
    romaji: string;
    english: string | null;
    native: string | null;
  };
  coverImage: {
    extraLarge: string | null;
    large: string | null;
  };
  description: string | null;
  chapters: number | null;
  volumes: number | null;
  status: "FINISHED" | "RELEASING" | "NOT_YET_RELEASED" | "CANCELLED" | "HIATUS";
  genres: string[];
  format: "MANGA" | "NOVEL" | "ONE_SHOT" | null;
  countryOfOrigin: string | null; // JP, KR, CN, TW
  updatedAt: number;
  trending: number;
  popularity: number;
}

interface AniListResponse {
  data: {
    Page: {
      media: AniListMedia[];
      pageInfo: {
        hasNextPage: boolean;
        currentPage: number;
        total: number;
      };
    };
  };
}

// ─── GraphQL Queries ─────────────────────────────

const TRENDING_QUERY = `
  query ($page: Int, $perPage: Int, $type: MediaType, $sort: [MediaSort]) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        hasNextPage
        currentPage
        total
      }
      media(type: $type, sort: $sort, isAdult: false) {
        id
        title {
          romaji
          english
          native
        }
        coverImage {
          extraLarge
          large
        }
        description(asHtml: false)
        chapters
        volumes
        status
        genres
        format
        countryOfOrigin
        updatedAt
        trending
        popularity
      }
    }
  }
`;

const RECENTLY_UPDATED_QUERY = `
  query ($page: Int, $perPage: Int, $type: MediaType) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        hasNextPage
        currentPage
        total
      }
      media(type: $type, sort: UPDATED_AT_DESC, status: RELEASING, isAdult: false) {
        id
        title {
          romaji
          english
          native
        }
        coverImage {
          extraLarge
          large
        }
        description(asHtml: false)
        chapters
        volumes
        status
        genres
        format
        countryOfOrigin
        updatedAt
        trending
        popularity
      }
    }
  }
`;

// ─── API Client ──────────────────────────────────

async function query<T>(
  graphqlQuery: string,
  variables: Record<string, unknown>
): Promise<T> {
  const response = await fetch(ANILIST_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: graphqlQuery, variables }),
  });

  if (!response.ok) {
    throw new Error(
      `AniList API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}

// ─── Public Functions ────────────────────────────

/**
 * Fetch trending manga/manhwa/novel from AniList
 * Sorted by trending score (what's hot right now)
 */
export async function fetchTrending(
  page = 1,
  perPage = 50
): Promise<AniListMedia[]> {
  const result = await query<AniListResponse>(TRENDING_QUERY, {
    page,
    perPage,
    type: "MANGA", // includes manga, manhwa, manhua, novel
    sort: ["TRENDING_DESC"],
  });
  return result.data.Page.media;
}

/**
 * Fetch recently updated (ongoing) series
 * Sorted by most recently updated
 */
export async function fetchRecentlyUpdated(
  page = 1,
  perPage = 50
): Promise<AniListMedia[]> {
  const result = await query<AniListResponse>(RECENTLY_UPDATED_QUERY, {
    page,
    perPage,
    type: "MANGA",
  });
  return result.data.Page.media;
}

/**
 * Fetch popular manga for initial seed
 * Sorted by all-time popularity
 */
export async function fetchPopular(
  page = 1,
  perPage = 50
): Promise<AniListMedia[]> {
  const result = await query<AniListResponse>(TRENDING_QUERY, {
    page,
    perPage,
    type: "MANGA",
    sort: ["POPULARITY_DESC"],
  });
  return result.data.Page.media;
}

// ─── Helpers ─────────────────────────────────────

/**
 * Map AniList countryOfOrigin + format to our series type
 */
export function mapToSeriesType(
  media: AniListMedia
): "anime" | "manga" | "manhwa" | "manhua" | "novel" | "movie" | "other" {
  if (media.format === "NOVEL") return "novel";
  if (media.format === "MOVIE" || media.format === "SPECIAL") return "movie";
  switch (media.countryOfOrigin) {
    case "JP":
      return "manga";
    case "KR":
      return "manhwa";
    case "CN":
    case "TW":
      return "manhua";
    default:
      return media.format === "MANGA" ? "manga" : "other";
  }
}

/**
 * Map AniList status to our status
 */
export function mapToStatus(
  status: AniListMedia["status"]
): "ongoing" | "completed" | "hiatus" {
  switch (status) {
    case "RELEASING":
      return "ongoing";
    case "FINISHED":
      return "completed";
    case "HIATUS":
      return "hiatus";
    default:
      return "ongoing";
  }
}

/**
 * Clean HTML entities from description
 */
export function cleanDescription(desc: string | null): string | null {
  if (!desc) return null;
  return desc
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim()
    .slice(0, 500); // limit to 500 chars
}
