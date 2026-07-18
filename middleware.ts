import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Routes that use their own auth (cron secret), not CRANBANIA_API_KEY. */
const CRON_AUTH_EXEMPT = ["/api/itsm/sla/check"];

/** Public status routes with no board/business data - safe to leave open for uptime checks. */
const PUBLIC_STATUS_EXEMPT = ["/api/automation/status"];

function extractApiToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return request.headers.get("x-cranbania-api-key");
}

// NOTE: this shared-secret scheme is a stopgap. Per platform direction, auth
// should eventually route through Infinity-One (the platform-wide SSO/"one
// account, all services" layer) instead of a single CRANBANIA_API_KEY.
export function middleware(request: NextRequest) {
  const apiKey = process.env.CRANBANIA_API_KEY;
  if (!apiKey) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/")) return NextResponse.next();
  if (CRON_AUTH_EXEMPT.some((p) => pathname === p)) return NextResponse.next();
  if (PUBLIC_STATUS_EXEMPT.some((p) => pathname === p)) return NextResponse.next();

  if (extractApiToken(request) !== apiKey) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        hint:
          "API routes require Authorization: Bearer $CRANBANIA_API_KEY or header X-CranBania-Api-Key",
      },
      { status: 401 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
