import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import {
  Board,
  Card,
  ColumnId,
  DEFAULT_COLUMNS,
  COLUMN_IDS,
} from "./types";

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
      cards: board.cards ?? [],
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

export async function listCards(columnId?: ColumnId): Promise<Card[]> {
  const board = await readBoard();
  const cards = columnId
    ? board.cards.filter((c) => c.columnId === columnId)
    : board.cards;
  return cards.sort((a, b) => a.order - b.order);
}

export async function getCard(id: string): Promise<Card | null> {
  const board = await readBoard();
  return board.cards.find((c) => c.id === id) ?? null;
}

export interface CreateCardInput {
  title: string;
  description?: string;
  columnId?: ColumnId;
  assignee?: string;
  tags?: string[];
}

export async function createCard(input: CreateCardInput): Promise<Card> {
  const board = await readBoard();
  const columnId = input.columnId ?? "backlog";
  if (!COLUMN_IDS.includes(columnId)) {
    throw new Error(`Invalid columnId: ${columnId}`);
  }

  const now = new Date().toISOString();
  const card: Card = {
    id: randomUUID(),
    title: input.title,
    description: input.description ?? "",
    columnId,
    order: nextOrder(board.cards, columnId),
    assignee: input.assignee,
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
  };

  board.cards.push(card);
  await writeBoard(board);
  return card;
}

export interface UpdateCardInput {
  title?: string;
  description?: string;
  assignee?: string;
  tags?: string[];
}

export async function updateCard(
  id: string,
  input: UpdateCardInput,
): Promise<Card | null> {
  const board = await readBoard();
  const index = board.cards.findIndex((c) => c.id === id);
  if (index === -1) return null;

  const existing = board.cards[index];
  const updated: Card = {
    ...existing,
    ...input,
    updatedAt: new Date().toISOString(),
  };
  board.cards[index] = updated;
  await writeBoard(board);
  return updated;
}

export async function moveCard(
  id: string,
  columnId: ColumnId,
  order?: number,
): Promise<Card | null> {
  if (!COLUMN_IDS.includes(columnId)) {
    throw new Error(`Invalid columnId: ${columnId}`);
  }

  const board = await readBoard();
  const index = board.cards.findIndex((c) => c.id === id);
  if (index === -1) return null;

  const card = board.cards[index];
  const newOrder = order ?? nextOrder(
    board.cards.filter((c) => c.id !== id),
    columnId,
  );

  board.cards[index] = {
    ...card,
    columnId,
    order: newOrder,
    updatedAt: new Date().toISOString(),
  };
  await writeBoard(board);
  return board.cards[index];
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
}> {
  const board = await readBoard();
  return {
    columns: board.columns.map((col) => ({
      id: col.id,
      title: col.title,
      cardCount: board.cards.filter((c) => c.columnId === col.id).length,
    })),
    totalCards: board.cards.length,
  };
}
