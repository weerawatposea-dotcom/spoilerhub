"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// ─── Types ───────────────────────────────────────

interface SeriesResult {
  id: string;
  title: string;
  type: string;
  slug: string;
  coverImage: string | null;
}

interface SpoilerResult {
  id: string;
  title: string;
  slug: string;
  chapter: string | null;
  seriesTitle: string;
  seriesSlug: string;
}

interface SearchResults {
  series: SeriesResult[];
  spoilers: SpoilerResult[];
}

// ─── Type dot colors ─────────────────────────────

const TYPE_DOT: Record<string, string> = {
  anime: "bg-blue-500",
  manga: "bg-red-500",
  manhwa: "bg-emerald-500",
  manhua: "bg-amber-500",
  novel: "bg-violet-500",
  movie: "bg-pink-500",
  tv_series: "bg-cyan-500",
  drama: "bg-rose-500",
  other: "bg-slate-500",
};

// ─── Component ───────────────────────────────────

export function UniversalSearch() {
  const t = useTranslations("UniversalSearch");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error("Search failed");
        const data: SearchResults = await res.json();
        setResults(data);
        setIsOpen(true);
      } catch {
        setResults(null);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [query]);

  // Dismiss on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Dismiss on Escape key
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  }, []);

  const handleResultClick = useCallback(() => {
    setIsOpen(false);
    setQuery("");
  }, []);

  const hasResults =
    results && (results.series.length > 0 || results.spoilers.length > 0);
  const isEmpty = results && !hasResults;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search input */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <Input
          ref={inputRef}
          type="search"
          placeholder={t("placeholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results && hasResults) setIsOpen(true);
          }}
          className="pl-9 pr-4 h-9 text-sm"
          aria-label={t("searchLabel")}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          role="combobox"
        />
      </div>

      {/* Dropdown */}
      {(isOpen || isLoading) && query.length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[400px] overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              {t("loading")}
            </div>
          )}

          {/* No results */}
          {!isLoading && isEmpty && (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              {t("noResults")}
            </div>
          )}

          {/* Results */}
          {!isLoading && hasResults && (
            <>
              {/* Series section */}
              {results.series.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50">
                    {t("seriesSection")}
                  </div>
                  {results.series.map((s) => (
                    <Link
                      key={s.id}
                      href={`/series/${s.slug}`}
                      onClick={handleResultClick}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent transition-colors"
                    >
                      {/* Mini thumbnail */}
                      <div className="relative h-9 w-6 shrink-0 overflow-hidden rounded bg-muted">
                        {s.coverImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={s.coverImage}
                            alt={s.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[8px] text-muted-foreground">
                            ?
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${TYPE_DOT[s.type] ?? TYPE_DOT.other}`}
                          />
                          <span className="text-[10px] text-muted-foreground capitalize">
                            {s.type.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Spoilers section */}
              {results.spoilers.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50">
                    {t("spoilersSection")}
                  </div>
                  {results.spoilers.map((sp) => (
                    <Link
                      key={sp.id}
                      href={`/spoiler/${sp.slug}`}
                      onClick={handleResultClick}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{sp.title}</p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {sp.seriesTitle}
                        </p>
                      </div>
                      {sp.chapter && (
                        <Badge variant="outline" className="shrink-0 text-[10px] h-5">
                          Ch.{sp.chapter}
                        </Badge>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Mobile search toggle wrapper ────────────────

export function MobileSearchToggle() {
  const t = useTranslations("UniversalSearch");
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="md:hidden">
      {isExpanded ? (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <UniversalSearch />
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close search"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label={t("searchLabel")}
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      )}
    </div>
  );
}
