import { NextResponse } from "next/server";
import { authRequiredResponse, verifyApiAuth } from "@/lib/services/auth";
import { buildAutomationStatus } from "@/lib/automation/status";

/** GET /api/automation/status — automation health for agents and ops */
export async function GET(request: Request) {
  if (!verifyApiAuth(request)) {
    return NextResponse.json(authRequiredResponse("api"), { status: 401 });
  }

  return NextResponse.json(await buildAutomationStatus());
}
