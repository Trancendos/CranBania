import type { Card, SlaStatus } from "./types";

export function computeSlaStatus(card: Card, now = Date.now()): SlaStatus {
  const resolved = card.columnId === "done" || Boolean(card.resolvedAt);
  if (!card.slaDueAt) {
    return { cardId: card.id, breached: false, resolved };
  }

  const dueMs = new Date(card.slaDueAt).getTime();
  const breached = !resolved && now > dueMs;

  return {
    cardId: card.id,
    dueAt: card.slaDueAt,
    breached,
    remainingMs: resolved ? 0 : Math.max(0, dueMs - now),
    resolved,
  };
}

/** Percent of SLA window remaining that triggers card.sla_warning (default 25). */
export function getSlaWarningThresholdPercent(): number {
  const parsed = Number(process.env.CRANBANIA_SLA_WARNING_PERCENT ?? 25);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed >= 100) return 25;
  return parsed;
}

/** True when the card is inside the final threshold of its SLA window (not yet breached). */
export function isSlaWarning(card: Card, now = Date.now()): boolean {
  const status = computeSlaStatus(card, now);
  if (status.resolved || status.breached || !status.dueAt || status.remainingMs == null) {
    return false;
  }

  const createdMs = new Date(card.createdAt).getTime();
  const dueMs = new Date(status.dueAt).getTime();
  const totalMs = dueMs - createdMs;
  if (totalMs <= 0) return false;

  const threshold = getSlaWarningThresholdPercent() / 100;
  return status.remainingMs <= totalMs * threshold;
}

export function formatSlaRemaining(ms: number): string {
  if (ms <= 0) return "breached";
  const hours = Math.floor(ms / 3600_000);
  const mins = Math.floor((ms % 3600_000) / 60_000);
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
