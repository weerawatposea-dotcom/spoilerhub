"use client";

import { toggleBookmark } from "@/actions/bookmark";
import { Button } from "@/components/ui/button";
import { useTransition } from "react";

export function BookmarkButton({ seriesId, isBookmarked }: { seriesId: string; isBookmarked: boolean }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button variant={isBookmarked ? "default" : "outline"} size="sm" disabled={isPending}
      onClick={() => startTransition(() => toggleBookmark(seriesId))}>
      {isBookmarked ? "Bookmarked" : "Bookmark"}
    </Button>
  );
}
