import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = createMiddleware(routing);

const protectedPaths = ["/create", "/bookmarks", "/notifications"];
const adminPaths = ["/admin"];

// Thai-speaking countries/regions
const THAI_COUNTRIES = ["TH"]; // ISO 3166-1 alpha-2

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Auto locale detection on first visit ────────────
  // If user has no NEXT_LOCALE cookie yet (first visit),
  // detect locale from Accept-Language + geo headers
  const localeCookie = request.cookies.get("NEXT_LOCALE")?.value;

  if (!localeCookie && pathname === "/") {
    // Check Railway/Cloudflare geo headers first
    const country =
      request.headers.get("cf-ipcountry") ?? // Cloudflare
      request.headers.get("x-vercel-ip-country") ?? // Vercel
      request.headers.get("x-country-code") ?? // some CDNs
      null;

    if (country && THAI_COUNTRIES.includes(country.toUpperCase())) {
      // Thai IP → redirect to /th and set cookie
      const response = NextResponse.redirect(new URL("/th", request.url));
      response.cookies.set("NEXT_LOCALE", "th", {
        path: "/",
        maxAge: 365 * 24 * 60 * 60, // 1 year
        sameSite: "lax",
      });
      return response;
    }

    // Fallback: check Accept-Language header
    const acceptLang = request.headers.get("accept-language") ?? "";
    const prefersThai = acceptLang
      .split(",")
      .some((lang) => lang.trim().toLowerCase().startsWith("th"));

    if (prefersThai) {
      const response = NextResponse.redirect(new URL("/th", request.url));
      response.cookies.set("NEXT_LOCALE", "th", {
        path: "/",
        maxAge: 365 * 24 * 60 * 60,
        sameSite: "lax",
      });
      return response;
    }
  }

  // ─── Auth guard ────────────────────────────────────
  const pathnameWithoutLocale = pathname.replace(/^\/(th|en)/, "");

  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ??
    request.cookies.get("__Secure-authjs.session-token")?.value;

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

  // ─── next-intl middleware ──────────────────────────
  // This handles: locale prefix, Accept-Language detection,
  // NEXT_LOCALE cookie read/write, hreflang headers
  return intlMiddleware(request);
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
