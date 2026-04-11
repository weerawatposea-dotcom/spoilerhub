/**
 * Helper to select localized content fields from DB rows.
 * Falls back to English (original) if Thai translation is not available.
 */

interface LocalizableSeries {
  title: string;
  synopsis?: string | null;
  titleTh?: string | null;
  synopsisTh?: string | null;
}

/**
 * Get the display title for a series based on locale.
 * Falls back to original (English) if Thai is not available.
 */
export function getLocalizedTitle(
  series: LocalizableSeries,
  locale: string
): string {
  if (locale === "th" && series.titleTh) {
    return series.titleTh;
  }
  return series.title;
}

/**
 * Get the display synopsis for a series based on locale.
 * Falls back to original (English) if Thai is not available.
 */
export function getLocalizedSynopsis(
  series: LocalizableSeries,
  locale: string
): string | null {
  if (locale === "th" && series.synopsisTh) {
    return series.synopsisTh;
  }
  return series.synopsis;
}
