import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { createJournalEntry } from "./journal";
import { dispatchWebhooks } from "./webhooks";
import { createWorktreeForCard } from "./worktree";
import {
  Board,
  Card,
  CardType,
  CodeChange,
  ColumnId,
  DEFAULT_COLUMNS,
  COLUMN_IDS,
  JournalEntry,
  Priority,
  Prince2Stage,
  migrateCard,
} from "./types";
import { computeSlaStatus } from "./sla";
import { runSlaBreachCheckForCard } from "./sla-monitor";
import { getActiveSprint } from "./workspace";

function boardPath() {
  return path.join(process.cwd(), "data", "board.json");
}

function dataDir() {
  return path.join(process.cwd(), "data");
}

function emptyBoard(): Board {
  return { columns: DEFAULT_COLUMNS, cards: [] };
}

async function ensureDataDir() {
  await fs.mkdir(dataDir(), { recursive: true });
}

export async function readBoard(): Promise<Board> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(boardPath(), "utf-8");
    const board = JSON.parse(raw) as Board;
    return {
      columns: DEFAULT_COLUMNS,
      cards: (board.cards ?? []).map((c) => migrateCard(c)),
    };
  } catch {
    const board = emptyBoard();
    await writeBoard(board);
    return board;
  }
}

export async function writeBoard(board: Board): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(boardPath(), JSON.stringify(board, null, 2), "utf-8");
}

function nextOrder(cards: Card[], columnId: ColumnId): number {
  const inColumn = cards.filter((c) => c.columnId === columnId);
  if (inColumn.length === 0) return 0;
  return Math.max(...inColumn.map((c) => c.order)) + 1;
}

function findCardIndex(board: Board, id: string): number {
  return board.cards.findIndex((c) => c.id === id);
}

export async function listCards(columnId?: ColumnId): Promise<Card[]> {
  const board = await readBoard();
  const cards = columnId
    ? board.cards.filter((c) => c.columnId === columnId)
    : board.cards;
  return cards.sort((a, b) => a.order - b.order);
}

export async function listBacklog(): Promise<Card[]> {
  return listCards("backlog");
}

export async function getCard(id: string): Promise<Card | null> {
  const board = await readBoard();
  return board.cards.find((c) => c.id === id) ?? null;
}

export async function getCardJournal(id: string): Promise<JournalEntry[] | null> {
  const card = await getCard(id);
  return card ? card.journal : null;
}

export interface CreateCardInput {
  title: string;
  description?: string;
  columnId?: ColumnId;
  assignee?: string;
  tags?: string[];
  actor?: string;
  cardType?: CardType;
  priority?: Priority;
  epicId?: string;
  sprintId?: string;
  prince2Stage?: Prince2Stage;
  slaResponseHours?: number;
  slaDueAt?: string;
  storyPoints?: number;
}

export async function createCard(input: CreateCardInput): Promise<Card> {
  const board = await readBoard();
  const columnId = input.columnId ?? "backlog";
  if (!COLUMN_IDS.includes(columnId)) {
    throw new Error(`Invalid columnId: ${columnId}`);
  }

  const now = new Date().toISOString();
  const actor = input.actor ?? "human";
  const cardType = input.cardType ?? "task";
  const activeSprint = await getActiveSprint();
  const sprintId = input.sprintId ?? activeSprint?.id;
  const journal: JournalEntry[] = [
    createJournalEntry(
      "created",
      `Card created in ${columnId} (${cardType})`,
      actor,
      { columnId, title: input.title, cardType },
    ),
  ];
  if (sprintId && !input.sprintId && activeSprint) {
    journal.push(
      createJournalEntry(
        "updated",
        `Auto-assigned to sprint: ${activeSprint.name}`,
        "system",
        { sprintId: activeSprint.id },
      ),
    );
  }
  const card: Card = migrateCard({
    id: randomUUID(),
    title: input.title,
    description: input.description ?? "",
    columnId,
    order: nextOrder(board.cards, columnId),
    assignee: input.assignee,
    tags: input.tags ?? [],
    cardType,
    priority: input.priority,
    epicId: input.epicId,
    sprintId,
    prince2Stage: input.prince2Stage,
    slaResponseHours: input.slaResponseHours,
    slaDueAt: input.slaDueAt,
    storyPoints: input.storyPoints,
    journal,
    codeChanges: [],
    createdAt: now,
    updatedAt: now,
  });

  board.cards.push(card);
  await writeBoard(board);
  await runSlaBreachCheckForCard(card.id);
  return (await getCard(card.id)) ?? card;
}

export interface UpdateCardInput {
  title?: string;
  description?: string;
  assignee?: string;
  tags?: string[];
  actor?: string;
  cardType?: CardType;
  priority?: Priority;
  epicId?: string | null;
  sprintId?: string | null;
  prince2Stage?: Prince2Stage;
  slaResponseHours?: number;
  storyPoints?: number;
}

export async function updateCard(
  id: string,
  input: UpdateCardInput,
): Promise<Card | null> {
  const board = await readBoard();
  const index = findCardIndex(board, id);
  if (index === -1) return null;

  const existing = board.cards[index];
  const actor = input.actor ?? "human";
  const changes: string[] = [];
  if (input.title && input.title !== existing.title) changes.push("title");
  if (input.description !== undefined && input.description !== existing.description) {
    changes.push("description");
  }
  if (input.assignee !== undefined && input.assignee !== existing.assignee) {
    changes.push("assignee");
  }
  if (input.tags && JSON.stringify(input.tags) !== JSON.stringify(existing.tags)) {
    changes.push("tags");
  }
  if (input.cardType && input.cardType !== existing.cardType) changes.push("cardType");
  if (input.priority && input.priority !== existing.priority) changes.push("priority");
  if (input.epicId !== undefined && input.epicId !== existing.epicId) changes.push("epicId");
  if (input.sprintId !== undefined && input.sprintId !== existing.sprintId) {
    changes.push("sprintId");
  }
  if (input.prince2Stage && input.prince2Stage !== existing.prince2Stage) {
    changes.push("prince2Stage");
  }
  if (input.storyPoints !== undefined && input.storyPoints !== existing.storyPoints) {
    changes.push("storyPoints");
  }

  const updated: Card = {
    ...existing,
    title: input.title ?? existing.title,
    description: input.description ?? existing.description,
    assignee: input.assignee ?? existing.assignee,
    tags: input.tags ?? existing.tags,
    cardType: input.cardType ?? existing.cardType,
    priority: input.priority ?? existing.priority,
    epicId: input.epicId === null ? undefined : (input.epicId ?? existing.epicId),
    sprintId:
      input.sprintId === null ? undefined : (input.sprintId ?? existing.sprintId),
    prince2Stage: input.prince2Stage ?? existing.prince2Stage,
    slaResponseHours: input.slaResponseHours ?? existing.slaResponseHours,
    storyPoints: input.storyPoints ?? existing.storyPoints,
    journal: [
      ...existing.journal,
      ...(changes.length > 0
        ? [
            createJournalEntry(
              "updated",
              `Updated: ${changes.join(", ")}`,
              actor,
              { fields: changes },
            ),
          ]
        : []),
    ],
    updatedAt: new Date().toISOString(),
  };
  board.cards[index] = updated;
  await writeBoard(board);
  return updated;
}

export interface MoveCardOptions {
  actor?: string;
  skipSideEffects?: boolean;
}

async function handleInProgressSideEffects(
  card: Card,
  actor: string,
): Promise<Card> {
  let updated = { ...card };

  if (!updated.worktree) {
    try {
      const worktree = await createWorktreeForCard(card.id, card.title);
      updated = {
        ...updated,
        worktree,
        journal: [
          ...updated.journal,
          createJournalEntry(
            "worktree",
            `Git worktree created at ${worktree.path} (branch ${worktree.branch})`,
            actor,
            { worktree },
          ),
        ],
      };
    } catch (err) {
      updated = {
        ...updated,
        journal: [
          ...updated.journal,
          createJournalEntry(
            "worktree",
            `Worktree skipped: ${err instanceof Error ? err.message : "failed"}`,
            "system",
          ),
        ],
      };
    }
  }

  const webhookPayload = {
    event: "card.in_progress" as const,
    at: new Date().toISOString(),
    card: {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      assignee: updated.assignee,
      tags: updated.tags,
      cardType: updated.cardType,
      priority: updated.priority,
      worktree: updated.worktree
        ? { path: updated.worktree.path, branch: updated.worktree.branch }
        : undefined,
    },
  };

  const results = await dispatchWebhooks(webhookPayload);
  for (const result of results) {
    updated = {
      ...updated,
      journal: [
        ...updated.journal,
        createJournalEntry(
          "webhook",
          result.ok
            ? `Webhook delivered to ${result.url} (${result.status})`
            : `Webhook failed for ${result.url}: ${result.error ?? result.status}`,
          "system",
          { result },
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
          "No webhooks configured for card.in_progress",
          "system",
        ),
      ],
    };
  }

  return updated;
}

export async function moveCard(
  id: string,
  columnId: ColumnId,
  order?: number,
  options: MoveCardOptions = {},
): Promise<Card | null> {
  if (!COLUMN_IDS.includes(columnId)) {
    throw new Error(`Invalid columnId: ${columnId}`);
  }

  const board = await readBoard();
  const index = findCardIndex(board, id);
  if (index === -1) return null;

  const card = board.cards[index];
  const fromColumn = card.columnId;
  const actor = options.actor ?? "human";

  if (fromColumn === columnId && order === undefined) {
    return card;
  }

  const newOrder =
    order ??
    nextOrder(
      board.cards.filter((c) => c.id !== id),
      columnId,
    );

  let updated: Card = {
    ...card,
    columnId,
    order: newOrder,
    journal: [
      ...card.journal,
      createJournalEntry(
        "moved",
        `Moved from ${fromColumn} → ${columnId}`,
        actor,
        { from: fromColumn, to: columnId },
      ),
    ],
    updatedAt: new Date().toISOString(),
  };

  if (
    !options.skipSideEffects &&
    columnId === "in_progress" &&
    fromColumn !== "in_progress"
  ) {
    updated = await handleInProgressSideEffects(updated, actor);
  }

  if (columnId === "done" && !updated.resolvedAt) {
    updated = {
      ...updated,
      resolvedAt: new Date().toISOString(),
      journal: [
        ...updated.journal,
        createJournalEntry("sla", "SLA clock stopped (resolved)", actor),
      ],
    };
  }

  board.cards[index] = updated;
  await writeBoard(board);
  await runSlaBreachCheckForCard(id);
  return (await getCard(id)) ?? updated;
}

export async function addComment(
  id: string,
  message: string,
  actor = "human",
): Promise<Card | null> {
  const board = await readBoard();
  const index = findCardIndex(board, id);
  if (index === -1) return null;

  const card = board.cards[index];
  const updated: Card = {
    ...card,
    journal: [
      ...card.journal,
      createJournalEntry("comment", message, actor),
    ],
    updatedAt: new Date().toISOString(),
  };
  board.cards[index] = updated;
  await writeBoard(board);
  return updated;
}

export interface AddCodeChangeInput {
  filePath: string;
  changeType: CodeChange["changeType"];
  content: string;
  previousContent?: string;
  language?: string;
  actor?: string;
}

export async function addCodeChange(
  id: string,
  input: AddCodeChangeInput,
): Promise<Card | null> {
  const board = await readBoard();
  const index = findCardIndex(board, id);
  if (index === -1) return null;

  const card = board.cards[index];
  const actor = input.actor ?? "agent";
  const change: CodeChange = {
    id: randomUUID(),
    filePath: input.filePath,
    changeType: input.changeType,
    content: input.content,
    previousContent: input.previousContent,
    language: input.language,
    at: new Date().toISOString(),
    actor,
  };

  const label =
    input.changeType === "added"
      ? "added"
      : input.changeType === "deleted"
        ? "deleted"
        : "edited";

  const updated: Card = {
    ...card,
    codeChanges: [...card.codeChanges, change],
    journal: [
      ...card.journal,
      createJournalEntry(
        "code_change",
        `Code ${label}: ${input.filePath}`,
        actor,
        { changeId: change.id, changeType: input.changeType },
      ),
    ],
    updatedAt: new Date().toISOString(),
  };
  board.cards[index] = updated;
  await writeBoard(board);
  return updated;
}

export async function deleteCard(id: string): Promise<boolean> {
  const board = await readBoard();
  const before = board.cards.length;
  board.cards = board.cards.filter((c) => c.id !== id);
  if (board.cards.length === before) return false;
  await writeBoard(board);
  return true;
}

export async function getBoardSummary(): Promise<{
  columns: { id: ColumnId; title: string; cardCount: number }[];
  totalCards: number;
  backlogCount: number;
  openIncidents: number;
  slaBreached: number;
}> {
  const board = await readBoard();
  const incidents = board.cards.filter(
    (c) => c.cardType === "incident" && c.columnId !== "done",
  );
  const breached = board.cards.filter(
    (c) => computeSlaStatus(c).breached,
  ).length;
  return {
    columns: board.columns.map((col) => ({
      id: col.id,
      title: col.title,
      cardCount: board.cards.filter((c) => c.columnId === col.id).length,
    })),
    totalCards: board.cards.length,
    backlogCount: board.cards.filter((c) => c.columnId === "backlog").length,
    openIncidents: incidents.length,
    slaBreached: breached,
  };
}

export async function listCardsByType(cardType: CardType): Promise<Card[]> {
  const board = await readBoard();
  return board.cards.filter((c) => c.cardType === cardType);
}

export async function listCardsBySprint(sprintId: string): Promise<Card[]> {
  const board = await readBoard();
  return board.cards.filter((c) => c.sprintId === sprintId);
}

export async function getSlaReport(): Promise<
  ReturnType<typeof computeSlaStatus>[]
> {
  const board = await readBoard();
  return board.cards
    .filter((c) => c.slaDueAt)
    .map((c) => computeSlaStatus(c));
}

export async function getPrince2Overview(): Promise<
  Record<Prince2Stage, number>
> {
  const board = await readBoard();
  const counts = {} as Record<Prince2Stage, number>;
  for (const stage of [
    "starting_up",
    "initiation",
    "delivery",
    "stage_boundary",
    "closing",
  ] as Prince2Stage[]) {
    counts[stage] = board.cards.filter((c) => c.prince2Stage === stage).length;
  }
  return counts;
}
