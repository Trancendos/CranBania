import { NextResponse } from "next/server";

/**
 * Container liveness probe. Deliberately unauthenticated, and deliberately
 * says nothing about the board.
 *
 * The Dockerfile's HEALTHCHECK used to hit `/api/board` with no credential,
 * which worked only because read routes were ungated. Gating them turned every
 * containerised deployment unhealthy: 401 with CRANBANIA_API_KEY set, 503
 * without it, while the server was serving traffic perfectly well. A probe has
 * to be reachable by something that holds no credential, so it gets a route of
 * its own rather than an exemption carved out of a data route.
 *
 * It returns a fixed shape and reads nothing, so being open costs nothing: no
 * card, count, or configuration value is observable through it.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok" });
}
