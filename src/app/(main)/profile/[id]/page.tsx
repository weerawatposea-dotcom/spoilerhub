import { Suspense } from "react";
import { PageLoading } from "@/components/loading";
import { ProfileContent } from "./content";
import type { Metadata } from "next";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!user) return {};
  return {
    title: `${user.name ?? "User"} — Profile`,
    alternates: { canonical: `/profile/${id}` },
  };
}

export default function ProfilePage({ params }: Props) {
  return (
    <Suspense fallback={<PageLoading />}>
      <ProfileContent params={params} />
    </Suspense>
  );
}
