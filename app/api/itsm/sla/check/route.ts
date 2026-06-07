import { NextRequest, NextResponse } from "next/server";
import { runSlaBreachChecks } from "@/lib/sla-monitor";
import { verifyCronAuth, authRequiredResponse } from "@/lib/services/auth";

/**
 * POST /api/itsm/sla/check
 * Scan all cards for SLA breaches and fire card.sla_breach webhooks once per card.
 *
 * Prefer built-in polling (npm run sla:poll) or Forgejo Actions — see docs/automation-recipes.md.
 */
export async function POST(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json(authRequiredResponse("cron"), { status: 401 });
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
    preferredAlternatives: [
      "npm run sla:poll (sidecar, adaptive)",
      "CRANBANIA_SLA_POLL_INTERVAL_MS with npm run start",
      ".forgejo/workflows/cranbania-sla-check.yml",
      "n8n schedule → POST this endpoint",
    ],
    auth: process.env.CRANBANIA_CRON_SECRET
      ? "Bearer CRANBANIA_CRON_SECRET"
      : "none (set CRANBANIA_CRON_SECRET in production)",
  });
}
