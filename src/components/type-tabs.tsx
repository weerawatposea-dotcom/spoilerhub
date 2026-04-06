"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TYPES = [
  { value: "all", label: "All" },
  { value: "anime", label: "Anime" },
  { value: "manga", label: "Manga" },
  { value: "manhwa", label: "Manhwa" },
  { value: "manhua", label: "Manhua" },
  { value: "novel", label: "Novel" },
];

export function TypeTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("type") ?? "all";

  return (
    <Tabs value={current} onValueChange={(value) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all") { params.delete("type"); } else { params.set("type", value); }
      router.push(`/?${params.toString()}`);
    }}>
      <TabsList>
        {TYPES.map((t) => (<TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>))}
      </TabsList>
    </Tabs>
  );
}
