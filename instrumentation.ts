/**
 * Next.js instrumentation — starts in-process SLA scheduler when configured.
 * Set CRANBANIA_SLA_POLL_INTERVAL_MS (e.g. 60000) alongside npm run start.
 */

export async function register() {
  if (!process.env.CRANBANIA_SLA_POLL_INTERVAL_MS) return;

  const { startSlaScheduler } = await import("./lib/services/sla-scheduler");
  startSlaScheduler();
  console.info(
    "[cranbania] In-process SLA scheduler enabled via CRANBANIA_SLA_POLL_INTERVAL_MS",
  );
}
