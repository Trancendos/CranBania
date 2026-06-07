import { NextResponse } from "next/server";
import { buildAutomationStatus } from "@/lib/automation/status";

/** GET /api/automation/status — automation health for agents and ops */
export async function GET() {
  return NextResponse.json(await buildAutomationStatus());
}
