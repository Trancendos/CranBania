import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Routes that use their own auth (cron secret), not CRANBANIA_API_KEY. Method-scoped to how the route is actually implemented. */
const CRON_AUTH_EXEMPT: { path: string; method: string }[] = [
  { path: "/api/itsm/sla/check", method: "POST" },
];

function extractApiToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return request.headers.get("x-cranbania-api-key");
}

// NOTE: this only gates *mutating* requests. It intentionally does NOT gate GET/read
// routes: the shipped browser dashboard (KanbanBoard, WorkspaceBar, IncidentQueue, etc.)
// calls plain `fetch("/api/...")` with no Authorization header and has no session/cookie
// mechanism of its own, so gating reads here would break the UI itself the moment
// CRANBANIA_API_KEY is set in production - the exact scenario the key exists for.
// Read-route protection needs either a real session/identity layer (this stopgap
// shared-secret scheme should eventually be replaced by Infinity-One, the platform-wide
// SSO/"one account, all services" layer) or a network boundary in front of this service,
// not a middleware header check with no client to send the header.
export function middleware(request: NextRequest) {
  const apiKey = process.env.CRANBANIA_API_KEY;
  if (!apiKey) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/")) return NextResponse.next();
  if (!MUTATING_METHODS.has(request.method)) return NextResponse.next();
  if (CRON_AUTH_EXEMPT.some((e) => e.path === pathname && e.method === request.method)) {
    return NextResponse.next();
  }

  if (extractApiToken(request) !== apiKey) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        hint:
          "Mutating API routes require Authorization: Bearer $CRANBANIA_API_KEY or header X-CranBania-Api-Key",
      },
      { status: 401 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
