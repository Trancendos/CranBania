#!/usr/bin/env npx tsx
/**
 * Standalone SLA poller sidecar — preferred over GitHub Actions.
 * Usage:
 *   npm run sla:poll          # adaptive loop
 *   npm run sla:poll:once     # single tick (Forgejo/systemd/n8n)
 */

import {
  getSchedulerConfig,
  runSlaSchedulerTick,
  startSlaScheduler,
} from "../lib/services/sla-scheduler";

const once = process.argv.includes("--once");

async function main() {
  if (once) {
    const result = await runSlaSchedulerTick();
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const cfg = getSchedulerConfig();
  console.log(
    `[cranbania] SLA poller started (default ${cfg.defaultIntervalMs}ms, adaptive ${cfg.minIntervalMs}–${cfg.maxIntervalMs}ms)`,
  );
  startSlaScheduler();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
