import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  deriveSessionToken,
  inProduction,
  timingSafeEqual,
} from "./lib/services/auth";

/** Routes that use their own auth (cron secret), not CRANBANIA_API_KEY. Method-scoped to how the route is actually implemented. */
const CRON_AUTH_EXEMPT: { path: string; method: string }[] = [
  { path: "/api/itsm/sla/check", method: "POST" },
];

/** Routes that must stay reachable unauthenticated, or nobody can ever authenticate. */
const AUTH_ROUTES = ["/api/auth/login", "/api/auth/logout"];

// Read routes used to be ungated, and the note here explained why: the shipped
// dashboard calls plain `fetch("/api/...")` with no Authorization header and had
// no session mechanism, so gating reads would have broken the UI the moment
// CRANBANIA_API_KEY was set — the exact scenario the key exists for. #35 supplies
// the missing half: a login page, a session cookie, and a redirect for page
// requests. With a client that can hold a credential, reads are gated too.
//
// The cookie does NOT hold the API key. #35 stored the key itself, which hands
// every browser the platform's shared secret — a value accepted as
// `Authorization: Bearer` on every mutating route, by any client. It holds a
// token derived from the key instead, and the two credentials are checked on
// separate paths: header/Bearer against the key, cookie against the derived
// token. A stolen cookie is therefore a browser session and nothing more.
//
// An unset key still means "auth disabled", which is correct for local dev and
// dangerous in production: this service is published at trancendos.com/townhall,
// so in production a missing key is a misconfiguration and API routes fail
// *closed* (503) rather than silently open.
async function isAuthorised(request: NextRequest, apiKey: string): Promise<boolean> {
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const header = bearer ?? request.headers.get("x-cranbania-api-key");
  if (header !== null && timingSafeEqual(header, apiKey)) return true;

  const cookie = request.cookies.get(SESSION_COOKIE);
  if (cookie) {
    return timingSafeEqual(cookie.value, await deriveSessionToken(apiKey));
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const apiKey = process.env.CRANBANIA_API_KEY;
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  // Evaluated before the missing-key branch: these routes authenticate with
  // CRANBANIA_CRON_SECRET, so CRANBANIA_API_KEY being unset says nothing about
  // whether they are safe to serve. Gating them on it would 503 the SLA scan on
  // a deployment that had correctly configured the only secret it actually uses.
  const cronExempt = CRON_AUTH_EXEMPT.some(
    (e) => e.path === pathname && e.method === request.method,
  );
  const authRoute = AUTH_ROUTES.includes(pathname);

  if (!apiKey) {
    if (inProduction() && isApi && !cronExempt && !authRoute) {
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

  if (cronExempt || authRoute) return NextResponse.next();

  if (await isAuthorised(request, apiKey)) return NextResponse.next();

  if (isApi) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        hint:
          "API routes require Authorization: Bearer $CRANBANIA_API_KEY, header " +
          "X-CranBania-Api-Key, or a session cookie from POST /api/auth/login",
      },
      { status: 401 },
    );
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  // `login` alone would also match /loginanything, leaving a page whose name
  // merely starts with "login" permanently ungated. Anchored to the exact path
  // and to everything under it.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login$|login/).*)"],
};
