export type ColumnId =
  | "backlog"
  | "planning"
  | "in_progress"
  | "review"
  | "done";

export interface Column {
  id: ColumnId;
  title: string;
  order: number;
}

export interface Card {
  id: string;
  title: string;
  description: string;
  columnId: ColumnId;
  order: number;
  assignee?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Board {
  columns: Column[];
  cards: Card[];
}

export const DEFAULT_COLUMNS: Column[] = [
  { id: "backlog", title: "Backlog", order: 0 },
  { id: "planning", title: "Planning", order: 1 },
  { id: "in_progress", title: "In Progress", order: 2 },
  { id: "review", title: "Review", order: 3 },
  { id: "done", title: "Done", order: 4 },
];

export const COLUMN_IDS = DEFAULT_COLUMNS.map((c) => c.id);
