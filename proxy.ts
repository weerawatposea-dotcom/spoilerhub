import createMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n/routing";
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = createMiddleware(routing);

const protectedPaths = ["/create", "/bookmarks", "/notifications"];
const adminPaths = ["/admin"];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Strip locale prefix for route matching
  const pathnameWithoutLocale = pathname.replace(/^\/(th|en)/, "");

  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ??
    request.cookies.get("__Secure-authjs.session-token")?.value;

  // Protected routes — require login
  if (
    [...protectedPaths, ...adminPaths].some((p) =>
      pathnameWithoutLocale.startsWith(p)
    )
  ) {
    if (!sessionToken) {
      const locale = pathname.startsWith("/en") ? "en" : "th";
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }
  }

  // Run next-intl middleware for locale handling
  return intlMiddleware(request);
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
