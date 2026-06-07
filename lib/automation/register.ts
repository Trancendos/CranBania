/**
 * Automation integration metadata and sidecar registration (lazy on first card event).
 */

import { getForgejoConfig } from "./forgejo-dispatch";

export { registerAutomationSidecars } from "./register-sidecars";

export function getIntegrationStatus() {
  const forgejo = getForgejoConfig();
  return {
    apiKeyAuth: Boolean(process.env.CRANBANIA_API_KEY),
    cronAuth: Boolean(process.env.CRANBANIA_CRON_SECRET),
    slaPollIntervalMs: process.env.CRANBANIA_SLA_POLL_INTERVAL_MS ?? null,
    forgejo: forgejo
      ? {
          configured: true,
          baseUrl: forgejo.baseUrl,
          owner: forgejo.owner,
          repo: forgejo.repo,
          ref: forgejo.ref,
          workflows: forgejo.workflows,
        }
      : { configured: false },
    woodpecker: {
          pipelines: [
            ".woodpecker/cranbania-ci.yaml",
            ".woodpecker/cranbania-sla.yaml",
            ".woodpecker/cranbania-agent.yaml",
          ],
          note: "Enable in Woodpecker; cranbania-ci runs npm test/lint/build on push/PR",
        },
    forgejoActions: {
          workflows: [
            ".forgejo/workflows/cranbania-ci.yml",
            ".forgejo/workflows/cranbania-sla-check.yml",
            ".forgejo/workflows/cranbania-agent.yml",
            ".forgejo/workflows/cranbania-sla-agent.yml",
          ],
        },
  };
}
