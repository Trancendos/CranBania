import { readBoard, writeBoard } from "./board";
import { createJournalEntry } from "./journal";
import { computeSlaStatus } from "./sla";
import { dispatchWebhooks } from "./webhooks";
import type { Card } from "./types";

async function notifySlaBreach(card: Card): Promise<Card> {
  const sla = computeSlaStatus(card);
  const payload = {
    event: "card.sla_breach" as const,
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
  };

  const results = await dispatchWebhooks(payload);
  let updated: Card = {
    ...card,
    slaBreachNotifiedAt: new Date().toISOString(),
    journal: [
      ...card.journal,
      createJournalEntry(
        "sla",
        `SLA breached (due ${card.slaDueAt})`,
        "system",
        { sla },
      ),
    ],
  };

  for (const result of results) {
    updated = {
      ...updated,
      journal: [
        ...updated.journal,
        createJournalEntry(
          "webhook",
          result.ok
            ? `SLA breach webhook → ${result.url} (${result.status})`
            : `SLA breach webhook failed → ${result.url}: ${result.error ?? result.status}`,
          "system",
          { result, event: "card.sla_breach" },
        ),
      ],
    };
  }

  if (results.length === 0) {
    updated = {
      ...updated,
      journal: [
        ...updated.journal,
        createJournalEntry(
          "webhook",
          "No webhooks configured for card.sla_breach",
          "system",
        ),
      ],
    };
  }

  return updated;
}

/** Scan all cards and fire SLA breach webhooks once per card. Returns cards updated. */
export async function runSlaBreachChecks(): Promise<number> {
  const board = await readBoard();
  let updatedCount = 0;

  for (let i = 0; i < board.cards.length; i++) {
    const card = board.cards[i];
    const sla = computeSlaStatus(card);
    if (!sla.breached || card.slaBreachNotifiedAt) continue;

    board.cards[i] = await notifySlaBreach(card);
    updatedCount++;
  }

  if (updatedCount > 0) {
    await writeBoard(board);
  }

  return updatedCount;
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
