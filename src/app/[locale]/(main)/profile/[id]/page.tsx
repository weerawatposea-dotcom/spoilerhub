import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { PageLoading } from "@/components/loading";
import { ProfileContent } from "./content";
import type { Metadata } from "next";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

async function getUserForMeta(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const t = await getTranslations("ProfilePage");
  const user = await getUserForMeta(id);
  if (!user) return {};
  return {
    title: t("metaTitle", { name: user.name ?? "User" }),
    alternates: { canonical: `/profile/${id}` },
  };
}

async function Connection() {
  await connection();
  return null;
}

function DynamicMarker() {
  return (
    <Suspense>
      <Connection />
    </Suspense>
  );
}

export default function ProfilePage({ params }: Props) {
  return (
    <>
      <DynamicMarker />
      <Suspense fallback={<PageLoading />}>
        <ProfileContent params={params} />
      </Suspense>
    </>
  );
}
