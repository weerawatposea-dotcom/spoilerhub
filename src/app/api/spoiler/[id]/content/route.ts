import { db } from "@/db";
import { spoilers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [spoiler] = await db.select({ content: spoilers.content }).from(spoilers).where(eq(spoilers.id, id)).limit(1);
  if (!spoiler) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ content: spoiler.content });
}
