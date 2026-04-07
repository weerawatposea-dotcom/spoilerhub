import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runSync } from "@/lib/sync";

/**
 * POST /api/sync — Trigger AniList sync
 *
 * Query params:
 * - mode: "full" | "update" (default: "update")
 * - key: secret key for cron access (optional, for external cron)
 *
 * Auth: requires admin role OR matching SYNC_SECRET key
 */
export async function POST(request: NextRequest) {
  const mode =
    (request.nextUrl.searchParams.get("mode") as "full" | "update") ?? "update";
  const key = request.nextUrl.searchParams.get("key");

  // Auth check: admin session OR sync secret
  const syncSecret = process.env.SYNC_SECRET;
  if (syncSecret && key === syncSecret) {
    // Cron access via secret key — allowed
  } else {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runSync(mode);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
