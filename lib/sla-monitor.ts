import { readBoard, writeBoard } from "./board";
import { createJournalEntry } from "./journal";
import { computeSlaStatus, isSlaWarning } from "./sla";
import { emitCardEvent } from "./services/event-bus";
import type { Card } from "./types";
import type { WebhookEvent } from "./types";

function buildSlaPayload(card: Card, event: WebhookEvent) {
  const sla = computeSlaStatus(card);
  return {
    event,
    at: new Date().toISOString(),
    card: {
      id: card.id,
      title: card.title,
      description: card.description,
      assignee: card.assignee,
      tags: card.tags,
      cardType: card.cardType,
      priority: card.priority,
      slaDueAt: card.slaDueAt,
    },
    sla,
  } as const;
}

async function appendWebhookJournal(
  card: Card,
  results: Awaited<ReturnType<typeof emitCardEvent>>,
  event: WebhookEvent,
  emptyMessage: string,
): Promise<Card> {
  let updated = card;

  for (const result of results) {
    updated = {
      ...updated,
      journal: [
        ...updated.journal,
        createJournalEntry(
          "webhook",
          result.ok
            ? `${event} webhook → ${result.url} (${result.status})`
            : `${event} webhook failed → ${result.url}: ${result.error ?? result.status}`,
          "system",
          { result, event },
        ),
      ],
    };
  }

  if (results.length === 0) {
    updated = {
      ...updated,
      journal: [
        ...updated.journal,
        createJournalEntry("webhook", emptyMessage, "system"),
      ],
    };
  }

  return updated;
}

async function notifySlaWarning(card: Card): Promise<Card> {
  const payload = buildSlaPayload(card, "card.sla_warning");
  const results = await emitCardEvent(payload);

  let updated: Card = {
    ...card,
    slaWarningNotifiedAt: new Date().toISOString(),
    journal: [
      ...card.journal,
      createJournalEntry(
        "sla",
        `SLA warning (${payload.sla.remainingMs ?? 0}ms remaining, due ${card.slaDueAt})`,
        "system",
        { sla: payload.sla },
      ),
    ],
  };

  updated = await appendWebhookJournal(
    updated,
    results,
    "card.sla_warning",
    "No webhooks configured for card.sla_warning",
  );

  return updated;
}

async function notifySlaBreach(card: Card): Promise<Card> {
  const payload = buildSlaPayload(card, "card.sla_breach");
  const results = await emitCardEvent(payload);

  let updated: Card = {
    ...card,
    slaBreachNotifiedAt: new Date().toISOString(),
    journal: [
      ...card.journal,
      createJournalEntry(
        "sla",
        `SLA breached (due ${card.slaDueAt})`,
        "system",
        { sla: payload.sla },
      ),
    ],
  };

  updated = await appendWebhookJournal(
    updated,
    results,
    "card.sla_breach",
    "No webhooks configured for card.sla_breach",
  );

  return updated;
}

export interface SlaCheckResult {
  breaches: number;
  warnings: number;
}

/** Scan all cards for SLA warnings and breaches; dispatch webhooks once per card. */
export async function runSlaChecks(): Promise<SlaCheckResult> {
  const board = await readBoard();
  let breaches = 0;
  let warnings = 0;

  for (let i = 0; i < board.cards.length; i++) {
    const card = board.cards[i];
    const sla = computeSlaStatus(card);

    if (sla.breached && !card.slaBreachNotifiedAt) {
      board.cards[i] = await notifySlaBreach(card);
      breaches++;
      continue;
    }

    if (!sla.breached && !card.slaWarningNotifiedAt && isSlaWarning(card)) {
      board.cards[i] = await notifySlaWarning(card);
      warnings++;
    }
  }

  if (breaches + warnings > 0) {
    await writeBoard(board);
  }

  return { breaches, warnings };
}

/** Scan all cards and fire SLA breach webhooks once per card. Returns cards updated. */
export async function runSlaBreachChecks(): Promise<number> {
  const { breaches } = await runSlaChecks();
  return breaches;
}

export async function runSlaBreachCheckForCard(cardId: string): Promise<Card | null> {
  const board = await readBoard();
  const index = board.cards.findIndex((c) => c.id === cardId);
  if (index === -1) return null;

  const card = board.cards[index];
  const sla = computeSlaStatus(card);
  if (!sla.breached || card.slaBreachNotifiedAt) return card;

  board.cards[index] = await notifySlaBreach(card);
  await writeBoard(board);
  return board.cards[index];
}
