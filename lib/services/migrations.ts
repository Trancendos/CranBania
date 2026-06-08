/**
 * Data migrations — CranBania equivalent of migration-helper (JSON files, not Convex).
 */

import type { Board, Card, WorkspaceData } from "../types";
import { migrateCard } from "../types";
import { defaultViewport, type VisualBoard, type VisualBoardsFile } from "../visual-types";

export const BOARD_DATA_VERSION = 3;
export const WORKSPACE_DATA_VERSION = 2;
export const VISUAL_BOARD_DATA_VERSION = 1;

export interface StoredBoard extends Board {
  version?: number;
}

export interface StoredWorkspace extends WorkspaceData {
  version?: number;
}

export function migrateBoard(raw: Partial<StoredBoard>): Board {
  const version = raw.version ?? 1;
  let cards = (raw.cards ?? []).map((c) => migrateCard(c as Card));

  if (version < 2) {
    cards = cards.map((c) =>
      c.journal.length > 0 ? c : { ...c, journal: [] },
    );
  }

  if (version < 3) {
    cards = cards.map((c) =>
      c.slaBreachNotifiedAt !== undefined
        ? c
        : { ...c, slaBreachNotifiedAt: undefined },
    );
  }

  return {
    columns: raw.columns ?? [],
    cards,
  };
}

export function migrateWorkspace(raw: Partial<StoredWorkspace>): WorkspaceData {
  return {
    epics: raw.epics ?? [],
    sprints: raw.sprints ?? [],
  };
}

export function stampBoard(board: Board): StoredBoard {
  return { ...board, version: BOARD_DATA_VERSION };
}

export function stampWorkspace(ws: WorkspaceData): StoredWorkspace {
  return { ...ws, version: WORKSPACE_DATA_VERSION };
}

export type StoredVisualBoards = VisualBoardsFile;

function migrateVisualBoard(board: Partial<VisualBoard>): VisualBoard {
  const createdAt = board.createdAt ?? new Date().toISOString();
  return {
    id: board.id ?? "",
    title: board.title ?? "Untitled board",
    description: board.description ?? "",
    boardType: board.boardType ?? "whiteboard",
    nodes: board.nodes ?? [],
    edges: board.edges ?? [],
    viewport: board.viewport ?? defaultViewport(),
    linkedCardId: board.linkedCardId,
    linkedEpicId: board.linkedEpicId,
    createdAt,
    updatedAt: board.updatedAt ?? createdAt,
  };
}

export function migrateVisualBoards(raw: Partial<StoredVisualBoards>): StoredVisualBoards {
  return {
    version: VISUAL_BOARD_DATA_VERSION,
    boards: (raw.boards ?? []).map((b) => migrateVisualBoard(b)),
  };
}

export function stampVisualBoards(data: { boards: VisualBoard[] }): StoredVisualBoards {
  return { ...data, version: VISUAL_BOARD_DATA_VERSION };
}
