"use server";

import { db } from "@/db";
import { reports } from "@/db/schema";
import { requireAuth, requireAdmin } from "@/lib/auth-utils";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function reportContent(targetType: "spoiler" | "comment", targetId: string, formData: FormData) {
  const session = await requireAuth();
  const reason = formData.get("reason") as string;
  await db.insert(reports).values({ reporterId: session.user.id, targetType, targetId, reason });
}

export async function resolveReport(reportId: string) {
  await requireAdmin();
  await db.update(reports).set({ status: "resolved" }).where(eq(reports.id, reportId));
  revalidatePath("/admin/reports");
}

export async function dismissReport(reportId: string) {
  await requireAdmin();
  await db.update(reports).set({ status: "dismissed" }).where(eq(reports.id, reportId));
  revalidatePath("/admin/reports");
}
