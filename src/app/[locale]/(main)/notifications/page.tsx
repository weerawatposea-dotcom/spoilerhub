import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { PageLoading } from "@/components/loading";
import { NotificationsContent } from "./content";

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense fallback={<PageLoading />}>
      <NotificationsContent />
    </Suspense>
  );
}
