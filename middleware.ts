import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cloudBaseSessionCookieName } from "@/lib/music/user-id";

const protectedPages = new Set(["/music", "/me", "/admin"]);
const protectedApiPrefixes = [
  "/api/admin",
  "/api/generate",
  "/api/me",
  "/api/jobs/",
  "/api/tracks/",
];
const publicTrackApiSuffixes = ["/play"];
const publicTrackPagePrefixes = ["/music/hall", "/music/rankings", "/music/"];

function isProtectedPage(pathname: string) {
  if (protectedPages.has(pathname)) {
    return true;
  }

  return false;
}

function isProtectedApi(pathname: string) {
  if (!protectedApiPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }

  if (pathname.startsWith("/api/tracks/")) {
    return !publicTrackApiSuffixes.some((suffix) => pathname.endsWith(suffix));
  }

  return true;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (
    pathname === "/login" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  if (publicTrackPagePrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const hasSession = Boolean(
    request.cookies.get(cloudBaseSessionCookieName)?.value,
  );

  if (isProtectedApi(pathname) && !hasSession) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  if (isProtectedPage(pathname) && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
