"use client";

import { toggleBookmark } from "@/actions/bookmark";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useTransition } from "react";

export function BookmarkButton({ seriesId, isBookmarked }: { seriesId: string; isBookmarked: boolean }) {
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("BookmarkButton");

  return (
    <Button variant={isBookmarked ? "default" : "outline"} size="sm" disabled={isPending}
      onClick={() => startTransition(() => toggleBookmark(seriesId))}>
      {isBookmarked ? t("bookmarked") : t("bookmark")}
    </Button>
  );
}
