"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale() {
    const newLocale = locale === "th" ? "en" : "th";
    router.replace(pathname, { locale: newLocale });
  }

  return (
    <Button variant="ghost" size="sm" className="text-xs font-medium" onClick={switchLocale}>
      {locale === "th" ? "EN" : "TH"}
    </Button>
  );
}
