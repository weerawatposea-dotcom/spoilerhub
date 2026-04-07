import { Suspense } from "react";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { PageLoading } from "@/components/loading";
import { ProfileContent } from "./content";
import type { Metadata } from "next";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const t = await getTranslations("ProfilePage");
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!user) return {};
  return {
    title: t("metaTitle", { name: user.name ?? "User" }),
    alternates: { canonical: `/profile/${id}` },
  };
}

export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense fallback={<PageLoading />}>
      <ProfileContent params={params} />
    </Suspense>
  );
}
