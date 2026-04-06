import { NextRequest, NextResponse } from "next/server";

const protectedRoutes = ["/create", "/bookmarks", "/notifications"];
const adminRoutes = ["/admin"];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for auth session cookie (Auth.js sets this)
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ??
    request.cookies.get("__Secure-authjs.session-token")?.value;

  // Protected routes — require login
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Admin routes — check via cookie is minimal; full check in page/action
  if (adminRoutes.some((route) => pathname.startsWith(route))) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/create/:path*", "/bookmarks/:path*", "/notifications/:path*", "/admin/:path*"],
};
