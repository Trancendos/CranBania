import { readWebhooks } from "../webhooks";
import { getSchedulerStatus } from "../services/sla-scheduler";
import { listSidecarHandlers } from "../services/event-bus";
import { BOARD_DATA_VERSION, WORKSPACE_DATA_VERSION } from "../services/migrations";
import { getIntegrationStatus } from "./register";

export const APP_VERSION = "0.5.0";

export async function buildAutomationStatus() {
  const webhooks = await readWebhooks();
  const scheduler = getSchedulerStatus();
  const integrations = getIntegrationStatus();

  return {
    version: APP_VERSION,
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
    sidecars: listSidecarHandlers(),
    integrations,
    recommendations: {
      slaPolling: scheduler.running
        ? "SLA sidecar poller active (npm run sla:poll)"
        : "npm run sla:poll, npm run start:full, Forgejo/Woodpecker cron, or POST /api/itsm/sla/check",
      mutatingApiAuth: process.env.CRANBANIA_API_KEY
        ? "CRANBANIA_API_KEY required for POST/PATCH/DELETE /api/*"
        : "set CRANBANIA_API_KEY in production",
      cronAuth: process.env.CRANBANIA_CRON_SECRET
        ? "POST /api/itsm/sla/check protected"
        : "set CRANBANIA_CRON_SECRET for production",
      forgejoAgents: integrations.forgejo.configured
        ? "Forgejo workflow dispatch active on card events"
        : "set FORGEJO_URL, FORGEJO_OWNER, FORGEJO_REPO, FORGEJO_TOKEN to enable",
    },
  };
}
