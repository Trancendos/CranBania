import { test } from "node:test";
import assert from "node:assert/strict";
import { getSchedulerConfig } from "./sla-scheduler";

test("scheduler config parses env interval", () => {
  process.env.CRANBANIA_SLA_POLL_INTERVAL_MS = "120000";
  const cfg = getSchedulerConfig();
  assert.equal(cfg.defaultIntervalMs, 120_000);
  assert.ok(cfg.minIntervalMs < cfg.maxIntervalMs);
  delete process.env.CRANBANIA_SLA_POLL_INTERVAL_MS;
});
