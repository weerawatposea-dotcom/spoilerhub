"use client";

import { useState } from "react";
import { createSpoiler } from "@/actions/spoiler";
import { SeriesSearch } from "@/components/series-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CreateSpoilerPage() {
  const [selectedSeries, setSelectedSeries] = useState<{ id: string; title: string } | null>(null);

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Write a Spoiler</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createSpoiler} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Series</label>
              <SeriesSearch onSelect={(s) => setSelectedSeries({ id: s.id, title: s.title })} />
              {selectedSeries && <input type="hidden" name="seriesId" value={selectedSeries.id} />}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Chapter / Episode</label>
              <Input name="chapter" placeholder="e.g. 385" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Title</label>
              <Input name="title" placeholder="Brief spoiler headline" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Spoiler Content (Markdown)</label>
              <Textarea name="content" placeholder="Write your spoiler here..." rows={10} required />
            </div>
            <Button type="submit" disabled={!selectedSeries}>
              Post Spoiler
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
