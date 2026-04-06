import { db } from "@/db";
import { series } from "@/db/schema";
import { ilike } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";

  if (q.length < 2) {
    return NextResponse.json([]);
  }

  const results = await db
    .select({ id: series.id, title: series.title, type: series.type })
    .from(series)
    .where(ilike(series.title, `%${q}%`))
    .limit(10);

  return NextResponse.json(results);
}
