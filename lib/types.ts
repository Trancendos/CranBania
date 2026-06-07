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

export type JournalEntryType =
  | "created"
  | "moved"
  | "updated"
  | "comment"
  | "code_change"
  | "webhook"
  | "worktree";

export interface JournalEntry {
  id: string;
  type: JournalEntryType;
  at: string;
  actor?: string;
  message: string;
  meta?: Record<string, unknown>;
}

export type CodeChangeType = "added" | "edited" | "deleted";

export interface CodeChange {
  id: string;
  filePath: string;
  changeType: CodeChangeType;
  content: string;
  previousContent?: string;
  language?: string;
  at: string;
  actor?: string;
}

export interface WorktreeInfo {
  path: string;
  branch: string;
  createdAt: string;
}

export interface Card {
  id: string;
  title: string;
  description: string;
  columnId: ColumnId;
  order: number;
  assignee?: string;
  tags: string[];
  journal: JournalEntry[];
  codeChanges: CodeChange[];
  worktree?: WorktreeInfo;
  createdAt: string;
  updatedAt: string;
}

export interface Board {
  columns: Column[];
  cards: Card[];
}

export interface WebhookConfig {
  id: string;
  url: string;
  enabled: boolean;
  events: ("card.in_progress")[];
  secret?: string;
}

export interface WebhooksFile {
  webhooks: WebhookConfig[];
}

export const DEFAULT_COLUMNS: Column[] = [
  { id: "backlog", title: "Backlog", order: 0 },
  { id: "planning", title: "Planning", order: 1 },
  { id: "in_progress", title: "In Progress", order: 2 },
  { id: "review", title: "Review", order: 3 },
  { id: "done", title: "Done", order: 4 },
];

export const COLUMN_IDS = DEFAULT_COLUMNS.map((c) => c.id);

export function migrateCard(raw: Partial<Card> & { id: string }): Card {
  return {
    id: raw.id,
    title: raw.title ?? "Untitled",
    description: raw.description ?? "",
    columnId: raw.columnId ?? "backlog",
    order: raw.order ?? 0,
    assignee: raw.assignee,
    tags: raw.tags ?? [],
    journal: raw.journal ?? [],
    codeChanges: raw.codeChanges ?? [],
    worktree: raw.worktree,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}
