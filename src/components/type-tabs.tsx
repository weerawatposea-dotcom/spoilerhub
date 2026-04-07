"use client";

import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TYPES = [
  { value: "all", label: "All" },
  { value: "anime", label: "Anime" },
  { value: "manga", label: "Manga" },
  { value: "manhwa", label: "Manhwa" },
  { value: "manhua", label: "Manhua" },
  { value: "novel", label: "Novel" },
];

export function TypeTabs({ basePath = "/" }: { basePath?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("TypeTabs");
  const current = searchParams.get("type") ?? "all";

  return (
    <Tabs value={current} onValueChange={(value) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all") { params.delete("type"); } else { params.set("type", value); }
      router.push(`${basePath}?${params.toString()}`);
    }}>
      <TabsList>
        {TYPES.map((tp) => (<TabsTrigger key={tp.value} value={tp.value}>{tp.value === "all" ? t("all") : tp.label}</TabsTrigger>))}
      </TabsList>
    </Tabs>
  );
}
