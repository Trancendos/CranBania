/**
 * Adaptive SLA breach poller — no GitHub Actions required.
 * Run via: npm run sla:poll | CRANBANIA_SLA_POLL_INTERVAL_MS with next start | Forgejo cron curl
 */

import { runSlaBreachChecks } from "../sla-monitor";

export interface SchedulerConfig {
  minIntervalMs: number;
  maxIntervalMs: number;
  defaultIntervalMs: number;
}

export interface SchedulerTickResult {
  notified: number;
  nextIntervalMs: number;
  checkedAt: string;
}

export function getSchedulerConfig(): SchedulerConfig {
  const parsed = Number(process.env.CRANBANIA_SLA_POLL_INTERVAL_MS ?? 60_000);
  const defaultIntervalMs = Number.isFinite(parsed) && parsed > 0 ? parsed : 60_000;
  return {
    minIntervalMs: 30_000,
    maxIntervalMs: 600_000,
    defaultIntervalMs,
  };
}

let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let currentIntervalMs = getSchedulerConfig().defaultIntervalMs;
let lastTick: SchedulerTickResult | null = null;
let tickCount = 0;

export function getSchedulerStatus() {
  return {
    running,
    currentIntervalMs,
    lastTick,
    tickCount,
    config: getSchedulerConfig(),
    mode: process.env.CRANBANIA_SLA_POLL_INTERVAL_MS
      ? "in-process or sidecar"
      : "manual or external cron only",
  };
}

/** One SLA scan; adapts next interval based on activity. */
export async function runSlaSchedulerTick(): Promise<SchedulerTickResult> {
  const cfg = getSchedulerConfig();
  const notified = await runSlaBreachChecks();

  if (notified > 0) {
    currentIntervalMs = cfg.minIntervalMs;
  } else {
    currentIntervalMs = Math.min(
      cfg.maxIntervalMs,
      Math.round(currentIntervalMs * 1.15),
    );
  }

  lastTick = {
    notified,
    nextIntervalMs: currentIntervalMs,
    checkedAt: new Date().toISOString(),
  };
  tickCount++;
  return lastTick;
}

export function startSlaScheduler(): void {
  if (running) return;
  running = true;
  currentIntervalMs = getSchedulerConfig().defaultIntervalMs;

  const loop = async () => {
    if (!running) return;
    try {
      const result = await runSlaSchedulerTick();
      currentIntervalMs = result.nextIntervalMs;
    } catch (err) {
      console.error("[cranbania] SLA scheduler error:", err);
    }
    timer = setTimeout(() => void loop(), currentIntervalMs);
  };

  void loop();
}

export function stopSlaScheduler(): void {
  running = false;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}
