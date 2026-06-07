import { NextResponse } from "next/server";
import { readWebhooks } from "@/lib/webhooks";
import { getSchedulerStatus } from "@/lib/services/sla-scheduler";
import { listSidecarHandlerCount } from "@/lib/services/event-bus";
import { BOARD_DATA_VERSION, WORKSPACE_DATA_VERSION } from "@/lib/services/migrations";

/** GET /api/automation/status — automation health for agents and ops */
export async function GET() {
  const webhooks = await readWebhooks();
  const scheduler = getSchedulerStatus();

  return NextResponse.json({
    version: "0.4.1",
    dataVersions: {
      board: BOARD_DATA_VERSION,
      workspace: WORKSPACE_DATA_VERSION,
    },
    scheduler,
    webhooks: {
      registered: webhooks.length,
      enabled: webhooks.filter((w) => w.enabled).length,
      events: [...new Set(webhooks.flatMap((w) => w.events))],
    },
    sidecarHandlers: listSidecarHandlerCount(),
    recommendations: {
      slaPolling: process.env.CRANBANIA_SLA_POLL_INTERVAL_MS
        ? "in-process scheduler active"
        : "run npm run sla:poll sidecar, set CRANBANIA_SLA_POLL_INTERVAL_MS, or use Forgejo/n8n cron",
      auth: process.env.CRANBANIA_CRON_SECRET
        ? "cron endpoint protected"
        : "set CRANBANIA_CRON_SECRET for production",
    },
  });
}
