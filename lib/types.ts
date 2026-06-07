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
  | "worktree"
  | "sla";

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

/** Agile + ITSM-lite card classification (free, built-in) */
export type CardType = "task" | "feature" | "bug" | "incident" | "change";

export type Priority = "low" | "medium" | "high" | "critical";

/** Prince2-lite governance stage (free tags, not a full Prince2 product) */
export type Prince2Stage =
  | "starting_up"
  | "initiation"
  | "delivery"
  | "stage_boundary"
  | "closing";

export type SprintStatus = "planning" | "active" | "closed";

export interface Sprint {
  id: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  createdAt: string;
}

export type EpicStatus = "open" | "done";

export interface Epic {
  id: string;
  title: string;
  description: string;
  status: EpicStatus;
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
  cardType: CardType;
  priority: Priority;
  epicId?: string;
  sprintId?: string;
  prince2Stage?: Prince2Stage;
  /** SLA response window in hours (incidents/changes) */
  slaResponseHours?: number;
  slaDueAt?: string;
  /** Set when SLA breach webhook has been sent (once per breach) */
  slaBreachNotifiedAt?: string;
  resolvedAt?: string;
  storyPoints?: number;
  journal: JournalEntry[];
  codeChanges: CodeChange[];
  worktree?: WorktreeInfo;
  createdAt: string;
  updatedAt: string;
}

export interface SlaStatus {
  cardId: string;
  dueAt?: string;
  breached: boolean;
  remainingMs?: number;
  resolved: boolean;
}

export interface Board {
  columns: Column[];
  cards: Card[];
}

export interface WorkspaceData {
  epics: Epic[];
  sprints: Sprint[];
}

export type WebhookEvent = "card.in_progress" | "card.sla_breach";

export interface WebhookConfig {
  id: string;
  url: string;
  enabled: boolean;
  events: WebhookEvent[];
  secret?: string;
}

export interface WebhooksFile {
  webhooks: WebhookConfig[];
}

export interface WorkspaceExport {
  version: 2;
  exportedAt: string;
  board: Board;
  workspace: WorkspaceData;
  /** Zero-cost mandate: no external SaaS IDs */
  zeroCost: true;
}

export const CARD_TYPES: CardType[] = [
  "task",
  "feature",
  "bug",
  "incident",
  "change",
];

export const PRIORITIES: Priority[] = ["low", "medium", "high", "critical"];

export const PRINCE2_STAGES: Prince2Stage[] = [
  "starting_up",
  "initiation",
  "delivery",
  "stage_boundary",
  "closing",
];

export const DEFAULT_SLA_HOURS: Record<CardType, number | undefined> = {
  task: undefined,
  feature: undefined,
  bug: 24,
  incident: 4,
  change: 72,
};

export const DEFAULT_COLUMNS: Column[] = [
  { id: "backlog", title: "Backlog", order: 0 },
  { id: "planning", title: "Planning", order: 1 },
  { id: "in_progress", title: "In Progress", order: 2 },
  { id: "review", title: "Review", order: 3 },
  { id: "done", title: "Done", order: 4 },
];

export const COLUMN_IDS = DEFAULT_COLUMNS.map((c) => c.id);

export function migrateCard(raw: Partial<Card> & { id: string }): Card {
  const cardType = raw.cardType ?? "task";
  const slaHours = raw.slaResponseHours ?? DEFAULT_SLA_HOURS[cardType];
  const createdAt = raw.createdAt ?? new Date().toISOString();

  return {
    id: raw.id,
    title: raw.title ?? "Untitled",
    description: raw.description ?? "",
    columnId: raw.columnId ?? "backlog",
    order: raw.order ?? 0,
    assignee: raw.assignee,
    tags: raw.tags ?? [],
    cardType,
    priority: raw.priority ?? "medium",
    epicId: raw.epicId,
    sprintId: raw.sprintId,
    prince2Stage: raw.prince2Stage ?? "starting_up",
    slaResponseHours: slaHours,
    slaDueAt:
      raw.slaDueAt ??
      (slaHours
        ? new Date(
            new Date(createdAt).getTime() + slaHours * 3600_000,
          ).toISOString()
        : undefined),
    slaBreachNotifiedAt: raw.slaBreachNotifiedAt,
    resolvedAt: raw.resolvedAt,
    storyPoints: raw.storyPoints,
    journal: raw.journal ?? [],
    codeChanges: raw.codeChanges ?? [],
    worktree: raw.worktree,
    createdAt,
    updatedAt: raw.updatedAt ?? createdAt,
  };
}
