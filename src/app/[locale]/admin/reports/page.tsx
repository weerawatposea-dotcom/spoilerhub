import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { PageLoading } from "@/components/loading";
import { AdminReportsContent } from "./content";

export default async function AdminReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense fallback={<PageLoading />}>
      <AdminReportsContent />
    </Suspense>
  );
}
