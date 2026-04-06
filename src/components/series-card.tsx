import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface SeriesCardProps { slug: string; title: string; type: string; status: string; coverImage: string | null }

export function SeriesCard({ slug, title, type, status, coverImage }: SeriesCardProps) {
  return (
    <Link href={`/series/${slug}`}>
      <Card className="overflow-hidden transition-colors hover:bg-accent/50">
        <div className="aspect-[2/3] relative">
          {coverImage ? (
            <Image src={coverImage} alt={title} fill className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-muted text-muted-foreground">No Image</div>
          )}
        </div>
        <CardContent className="p-3">
          <p className="truncate text-sm font-medium">{title}</p>
          <div className="mt-1 flex gap-1">
            <Badge variant="secondary" className="text-xs">{type}</Badge>
            <Badge variant="outline" className="text-xs">{status}</Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
