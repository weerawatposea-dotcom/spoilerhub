/**
 * Simple in-memory cache with TTL
 *
 * Why: Railway DB is in US-East, we're serving from US-East too,
 * but the DB queries still add ~500ms per page. This cache
 * eliminates repeated DB hits for the same data.
 *
 * TTL strategy:
 * - Browse/homepage data: 60s (frequently updated)
 * - Series detail: 300s (rarely changes)
 * - Genres list: 3600s (almost never changes)
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/**
 * Get or set cached data with TTL
 *
 * @param key - Cache key
 * @param ttlSeconds - Time to live in seconds
 * @param fetcher - Async function to fetch data if cache miss
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const existing = store.get(key) as CacheEntry<T> | undefined;

  if (existing && existing.expiresAt > now) {
    return existing.data;
  }

  const data = await fetcher();
  store.set(key, { data, expiresAt: now + ttlSeconds * 1000 });
  return data;
}

/**
 * Invalidate a specific cache key or all keys matching a prefix
 */
export function invalidateCache(keyOrPrefix: string) {
  if (keyOrPrefix.endsWith("*")) {
    const prefix = keyOrPrefix.slice(0, -1);
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) store.delete(key);
    }
  } else {
    store.delete(keyOrPrefix);
  }
}

/**
 * Clear entire cache
 */
export function clearCache() {
  store.clear();
}
