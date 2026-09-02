import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { inProduction } from "./lib/services/auth";



/** Routes that use their own auth (cron secret), not CRANBANIA_API_KEY. Method-scoped to how the route is actually implemented. */
const CRON_AUTH_EXEMPT: { path: string; method: string }[] = [
  { path: "/api/itsm/sla/check", method: "POST" },
];

function extractApiToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  const header = request.headers.get("x-cranbania-api-key");
  if (header) return header;
  const cookie = request.cookies.get("cranbania_session");
  if (cookie) return cookie.value;
  return null;
}

export function middleware(request: NextRequest) {
  const apiKey = process.env.CRANBANIA_API_KEY;
  const { pathname } = request.nextUrl;

  const cronExempt = CRON_AUTH_EXEMPT.some(
    (e) => e.path === pathname && e.method === request.method,
  );

  if (!apiKey) {
    if (
      inProduction() &&
      pathname.startsWith("/api/") &&
      !cronExempt
    ) {
      return NextResponse.json(
        {
          error: "Service misconfigured",
          hint:
            "CRANBANIA_API_KEY is not set. API routes are disabled in production " +
            "until it is configured.",
        },
        { status: 503 },
      );
    }
    return NextResponse.next();
  }

  if (cronExempt) return NextResponse.next();
  if (pathname.startsWith("/api/auth/")) return NextResponse.next();

  if (extractApiToken(request) !== apiKey) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          hint:
            "API routes require Authorization: Bearer $CRANBANIA_API_KEY, header X-CranBania-Api-Key, or cookie cranbania_session",
        },
        { status: 401 },
      );
    } else {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login).*)"],
};
