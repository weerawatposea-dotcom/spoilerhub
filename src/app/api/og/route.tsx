import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const title = searchParams.get("title") ?? "SpoilerHub";
  const chapter = searchParams.get("chapter");
  const type = searchParams.get("type");

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", fontFamily: "sans-serif" }}>
        {type && <div style={{ fontSize: 24, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>{type}</div>}
        <div style={{ fontSize: 48, fontWeight: 700, color: "#f8fafc", textAlign: "center", maxWidth: "80%", marginTop: 12 }}>{title}</div>
        {chapter && <div style={{ fontSize: 28, color: "#60a5fa", marginTop: 12 }}>Chapter {chapter}</div>}
        <div style={{ fontSize: 20, color: "#475569", marginTop: 32 }}>SpoilerHub</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
