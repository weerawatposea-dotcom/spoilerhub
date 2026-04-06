import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
  anime: "bg-blue-600",
  manga: "bg-red-600",
  manhwa: "bg-green-600",
  manhua: "bg-yellow-600",
  novel: "bg-purple-600",
  other: "bg-gray-600",
};

export function SpoilerCard({ slug, title, chapter, seriesTitle, seriesType, authorName, upvoteCount, commentCount, createdAt }: SpoilerCardProps) {
  return (
    <Link href={`/spoiler/${slug}`}>
      <Card className="transition-colors hover:bg-accent/50">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge className={`${TYPE_COLORS[seriesType] ?? TYPE_COLORS.other} text-white text-xs`}>{seriesType}</Badge>
              <span className="text-sm font-medium truncate">{seriesTitle}</span>
              <span className="text-xs text-muted-foreground">Ch. {chapter}</span>
            </div>
            <p className="mt-1 text-sm truncate">{title}</p>
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              <span>by {authorName ?? "Anonymous"}</span>
              <span>+{upvoteCount}</span>
              <span>{commentCount} comments</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
