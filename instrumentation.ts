/**
 * Next.js instrumentation hook.
 * Sidecars register lazily on first card event (see lib/services/event-bus.ts).
 * SLA polling runs via `npm run sla:poll` sidecar (keeps Node fs/crypto out of this bundle).
 */

export async function register() {
  // Intentionally empty — see docs/automation-recipes.md
}
