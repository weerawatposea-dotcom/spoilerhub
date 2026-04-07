import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { PageLoading } from "@/components/loading";
import { AdminContent } from "./content";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense fallback={<PageLoading />}>
      <AdminContent />
    </Suspense>
  );
}
