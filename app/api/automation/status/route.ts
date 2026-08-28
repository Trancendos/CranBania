import { NextResponse } from "next/server";
import { authRequiredResponse, verifyApiAuth } from "@/lib/services/auth";
import { buildAutomationStatus } from "@/lib/automation/status";

/**
 * GET /api/automation/status — automation health for agents and ops.
 *
 * Requires the API key. Unlike the rest of the read surface this route has no
 * browser client (the only other consumer, mcp/server.ts, calls
 * buildAutomationStatus() in process), and it reports scheduler state and
 * integration health, so it is gated here rather than in middleware.ts —
 * which deliberately guards only mutating methods.
 *
 * @returns 401 when the key is absent or wrong; otherwise the status payload.
 */
export async function GET(request: Request) {
  if (!verifyApiAuth(request)) {
    return NextResponse.json(authRequiredResponse("api"), { status: 401 });
  }

  return NextResponse.json(await buildAutomationStatus());
}
