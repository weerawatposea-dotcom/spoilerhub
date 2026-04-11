"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

interface SeriesCardProps {
  slug: string;
  title: string;
  type: string;
  status: string;
  coverImage: string | null;
  priority?: boolean;
}

const TYPE_DOT: Record<string, string> = {
  anime: "bg-blue-500",
  manga: "bg-red-500",
  manhwa: "bg-emerald-500",
  manhua: "bg-amber-500",
  novel: "bg-violet-500",
  other: "bg-slate-500",
  movie: "bg-pink-500",
  tv_series: "bg-cyan-500",
  drama: "bg-rose-500",
};

export function SeriesCard({
  slug,
  title,
  type,
  status,
  coverImage,
  priority = false,
}: SeriesCardProps) {
  const t = useTranslations("SeriesCard");

  return (
    <Link href={`/series/${slug}`} className="group block">
      <div className="overflow-hidden rounded-xl border border-border/30 bg-card/50 transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-0.5">
        {/* Cover Image */}
        <div className="aspect-[2/3] relative overflow-hidden bg-muted">
          {coverImage ? (
            <>
              <Image
                src={coverImage}
                alt={title}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                priority={priority}
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground/40">
              <svg
                className="h-10 w-10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </div>
          )}

          {/* Status badge overlay */}
          {status === "ongoing" && (
            <div className="absolute right-2 top-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ongoing
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3 space-y-1.5">
          <p className="truncate text-sm font-semibold leading-tight group-hover:text-primary transition-colors">
            {title}
          </p>
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${TYPE_DOT[type] ?? TYPE_DOT.other}`} />
            <span className="text-[11px] text-muted-foreground capitalize">{type}</span>
            {status === "completed" && (
              <Badge variant="outline" className="ml-auto text-[9px] px-1.5 py-0 h-4 font-normal">
                END
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
