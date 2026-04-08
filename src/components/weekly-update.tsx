import { db } from "@/db";
import { series } from "@/db/schema";
import { desc, sql } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { cached } from "@/lib/cache";
import Image from "next/image";
import { connection } from "next/server";
import { RelativeTime } from "./relative-time";

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

async function getWeeklyUpdates() {
  return cached("weekly-updates", 300, () =>
    db
      .select({
        id: series.id,
        slug: series.slug,
        title: series.title,
        type: series.type,
        coverImage: series.coverImage,
        latestChapter: series.latestChapter,
        latestChapterDate: series.latestChapterDate,
      })
      .from(series)
      .where(
        sql`${series.latestChapter} IS NOT NULL AND ${series.latestChapterDate} >= to_char(NOW() - INTERVAL '7 days', 'YYYY-MM-DD')`
      )
      .orderBy(desc(series.latestChapterDate))
      .limit(10)
  );
}


export async function WeeklyUpdate() {
  await connection();
  const updates = await getWeeklyUpdates();

  if (updates.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span>📅</span>
          Weekly Updates
          <Badge
            variant="secondary"
            className="ml-1 text-[11px] px-2 py-0.5 font-normal"
          >
            This Week
          </Badge>
        </h2>
      </div>

      {/* Mobile: horizontal scroll */}
      <div className="md:hidden overflow-x-auto pb-2">
        <div className="flex gap-3" style={{ width: "max-content" }}>
          {updates.map((s) => (
            <Link
              key={s.id}
              href={`/series/${s.slug}`}
              className="group flex w-48 shrink-0 items-start gap-3 rounded-xl border border-border/30 bg-card/50 p-3 transition-all hover:border-border hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/20"
            >
              <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                {s.coverImage ? (
                  <Image
                    src={s.coverImage}
                    alt={s.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground/40">
                    <svg
                      className="h-5 w-5"
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
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-xs font-semibold leading-tight group-hover:text-primary transition-colors">
                  {s.title}
                </p>
                <Badge
                  variant="secondary"
                  className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] px-1.5 py-0 h-4 font-medium border-0"
                >
                  Ch. {s.latestChapter}
                </Badge>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${TYPE_DOT[s.type] ?? TYPE_DOT.other}`}
                  />
                  {s.latestChapterDate && (
                    <RelativeTime date={s.latestChapterDate} className="text-[10px] text-muted-foreground" />
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Desktop: grid */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-3">
        {updates.map((s) => (
          <Link
            key={s.id}
            href={`/series/${s.slug}`}
            className="group flex items-start gap-3 rounded-xl border border-border/30 bg-card/50 p-3 transition-all hover:border-border hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/20"
          >
            <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
              {s.coverImage ? (
                <Image
                  src={s.coverImage}
                  alt={s.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground/40">
                  <svg
                    className="h-5 w-5"
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
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-sm font-semibold leading-tight group-hover:text-primary transition-colors">
                {s.title}
              </p>
              <Badge
                variant="secondary"
                className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] px-1.5 py-0 h-4 font-medium border-0"
              >
                Ch. {s.latestChapter}
              </Badge>
              <div className="flex items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${TYPE_DOT[s.type] ?? TYPE_DOT.other}`}
                />
                {s.latestChapterDate && (
                  <RelativeTime date={s.latestChapterDate} className="text-[11px] text-muted-foreground" />
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
