import { NextRequest, NextResponse } from "next/server";
import { runSlaBreachChecks } from "@/lib/sla-monitor";

/**
 * POST /api/itsm/sla/check
 * Scan all cards for SLA breaches and fire card.sla_breach webhooks once per card.
 * Intended for GitHub Actions cron or n8n schedule (see docs/automation-recipes.md).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRANBANIA_CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    if (token !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const updated = await runSlaBreachChecks();
  return NextResponse.json({
    ok: true,
    cardsNotified: updated,
    checkedAt: new Date().toISOString(),
  });
}

export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/itsm/sla/check",
    description: "Run SLA breach scan and dispatch webhooks",
    auth: process.env.CRANBANIA_CRON_SECRET
      ? "Bearer CRANBANIA_CRON_SECRET"
      : "none (set CRANBANIA_CRON_SECRET in production)",
  });
}
