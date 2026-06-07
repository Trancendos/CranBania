import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Routes that use their own auth (cron secret), not CRANBANIA_API_KEY. */
const API_KEY_EXEMPT = ["/api/itsm/sla/check"];

function extractApiToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return request.headers.get("x-cranbania-api-key");
}

export function middleware(request: NextRequest) {
  const apiKey = process.env.CRANBANIA_API_KEY;
  if (!apiKey) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/")) return NextResponse.next();
  if (!MUTATING_METHODS.has(request.method)) return NextResponse.next();
  if (API_KEY_EXEMPT.some((p) => pathname === p)) return NextResponse.next();

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
