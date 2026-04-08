"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { RelativeTime } from "./relative-time";

interface SpoilerCardProps {
  slug: string;
  title: string;
  chapter: string;
  seriesTitle: string;
  seriesType: string;
  authorName: string | null;
  upvoteCount: number;
  commentCount: number;
  createdAt: Date;
}

const TYPE_COLORS: Record<string, string> = {
  anime: "from-blue-600 to-blue-500",
  manga: "from-red-600 to-red-500",
  manhwa: "from-emerald-600 to-emerald-500",
  manhua: "from-amber-600 to-amber-500",
  novel: "from-violet-600 to-violet-500",
  other: "from-slate-600 to-slate-500",
  movie: "from-pink-600 to-pink-500",
  tv_series: "from-cyan-600 to-cyan-500",
  drama: "from-rose-600 to-rose-500",
};

const TYPE_GLOW: Record<string, string> = {
  anime: "group-hover:shadow-blue-500/20",
  manga: "group-hover:shadow-red-500/20",
  manhwa: "group-hover:shadow-emerald-500/20",
  manhua: "group-hover:shadow-amber-500/20",
  novel: "group-hover:shadow-violet-500/20",
  other: "group-hover:shadow-slate-500/20",
  movie: "group-hover:shadow-pink-500/20",
  tv_series: "group-hover:shadow-cyan-500/20",
  drama: "group-hover:shadow-rose-500/20",
};

export function SpoilerCard({
  slug,
  title,
  chapter,
  seriesTitle,
  seriesType,
  authorName,
  upvoteCount,
  commentCount,
  createdAt,
}: SpoilerCardProps) {
  const t = useTranslations("SpoilerCard");

  return (
    <Link href={`/spoiler/${slug}`} className="group block">
      <article
        className={`relative overflow-hidden rounded-xl border border-border/50 bg-card/80 p-4 transition-all duration-300 hover:border-border hover:bg-card group-hover:shadow-lg ${TYPE_GLOW[seriesType] ?? TYPE_GLOW.other} dark:bg-card/50 dark:hover:bg-card/80`}
      >
        {/* Type accent bar */}
        <div
          className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${TYPE_COLORS[seriesType] ?? TYPE_COLORS.other} opacity-60 transition-opacity group-hover:opacity-100`}
        />

        <div className="pl-3">
          <div className="flex items-center gap-2.5">
            <Badge
              className={`bg-gradient-to-r ${TYPE_COLORS[seriesType] ?? TYPE_COLORS.other} border-0 text-white text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5`}
            >
              {seriesType}
            </Badge>
            <span className="text-sm font-semibold truncate">{seriesTitle}</span>
            <span className="shrink-0 rounded-md bg-muted/80 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              {t("chapter", { chapter })}
            </span>
          </div>

          <p className="mt-1.5 text-sm leading-relaxed truncate text-foreground/90">
            {title}
          </p>

          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span>{t("by", { author: authorName ?? t("anonymous") })}</span>
            <span className="flex items-center gap-1">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
              {upvoteCount}
            </span>
            <span className="flex items-center gap-1">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {t("comments", { count: commentCount })}
            </span>
            <RelativeTime date={createdAt} className="text-muted-foreground" />
          </div>
        </div>
      </article>
    </Link>
  );
}
