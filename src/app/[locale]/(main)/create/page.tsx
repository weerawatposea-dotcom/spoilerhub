"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createSpoiler } from "@/actions/spoiler";
import { SeriesSearch } from "@/components/series-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CreateSpoilerPage() {
  const [selectedSeries, setSelectedSeries] = useState<{ id: string; title: string } | null>(null);
  const t = useTranslations("CreatePage");

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createSpoiler} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">{t("seriesLabel")}</label>
              <SeriesSearch onSelect={(s) => setSelectedSeries({ id: s.id, title: s.title })} />
              {selectedSeries && <input type="hidden" name="seriesId" value={selectedSeries.id} />}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("chapterLabel")}</label>
              <Input name="chapter" placeholder={t("chapterPlaceholder")} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("titleLabel")}</label>
              <Input name="title" placeholder={t("titlePlaceholder")} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("contentLabel")}</label>
              <Textarea name="content" placeholder={t("contentPlaceholder")} rows={10} required />
            </div>
            <Button type="submit" disabled={!selectedSeries}>
              {t("submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
